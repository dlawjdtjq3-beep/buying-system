/**
 * 구매 건별 사진 여러 장 (엘라 «사진 등록»)
 * - 저장소 purchase-images / <system>/gallery/<구매 id>/ 폴더에 보관 (DB 칸 추가 없음)
 * - 대표사진 = purchases.image_url (목록 썸네일). 폴더 사진 중 하나를 가리킴
 * - 올리기 전에 긴 변 640px JPEG 로 줄임
 */
import { supabase } from '@/lib/supabase';
import { shrinkDataUrl } from '@/lib/image';

const BUCKET = 'purchase-images';
const SYSTEM = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';
const folderOf = (id: string) => `${SYSTEM}/gallery/${id}`;

/** 저장된 공개 주소 → 저장소 안 경로 */
export function pathOfUrl(url: string): string | null {
  const m = url.split('?')[0].match(/\/object\/public\/purchase-images\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** 이 건 폴더의 사진 주소들 (올린 순서) */
export async function listGallery(id: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folderOf(id), {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error || !data) return [];
  return data
    .filter(f => f.name && !f.name.startsWith('.'))
    .map(f => supabase.storage.from(BUCKET).getPublicUrl(`${folderOf(id)}/${f.name}`).data.publicUrl);
}

/** 새 사진 한 장 올리고 공개 주소 돌려줌 */
export async function uploadGalleryPhoto(id: string, dataUrl: string, seq: number): Promise<string> {
  const small = await shrinkDataUrl(dataUrl);
  const [head, body] = small.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const name = `${Date.now()}-${String(seq).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = `${folderOf(id)}/${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([u8], { type: mime }));
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 이 건 폴더 안의 사진만 지움 (다른 곳 사진은 안 건드림). 실패한 개수 돌려줌 */
export async function removeGalleryPhotos(id: string, urls: string[]): Promise<number> {
  const paths = urls.map(pathOfUrl).filter((p): p is string => !!p && p.startsWith(folderOf(id) + '/'));
  if (paths.length === 0) return 0;
  const { data, error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) return paths.length;
  return Math.max(0, paths.length - (data?.length ?? 0));
}

/** File/Blob → dataURL */
export function fileToDataUrl(f: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
