/**
 * 사진 줄이기 — 올리기 전에 브라우저에서 긴 변 640px · JPEG 품질 0.6 으로 줄입니다.
 * 원본(1~5MB) → 보통 40~90KB. 목록 썸네일·확인용이면 충분.
 * 줄이다 실패하면(이상한 형식 등) 원본을 그대로 돌려줍니다.
 */
export const IMAGE_MAX_SIDE = 640;
export const IMAGE_QUALITY = 0.6;

export function shrinkDataUrl(dataUrl: string, maxSide = IMAGE_MAX_SIDE, quality = IMAGE_QUALITY): Promise<string> {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.fillStyle = '#fff'; // 투명 PNG 배경을 흰색으로
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out.length < dataUrl.length ? out : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * 목록에 쓸 «작은 사진» 주소.
 *
 * 목록에서는 40×40 으로 보여주는데 원본(370×469 · 30KB)을 통째로 받고 있었습니다.
 * Supabase Storage 의 변환 주소로 바꾸면 같은 그림을 5KB 정도로 받습니다 (약 1/6).
 * 중국처럼 느린 망에서는 한 페이지에 30장이라 차이가 큽니다.
 *
 * 변환을 쓸 수 없는 주소(옛 base64 사진, 바깥 주소)는 그대로 돌려줍니다.
 */
export function thumbUrl(src?: string, width = 96, quality = 60): string {
  if (!src) return '';
  if (!src.includes('/storage/v1/object/public/')) return src;
  const base = src.split('?')[0].replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return `${base}?width=${width}&height=${width}&resize=cover&quality=${quality}`;
}
