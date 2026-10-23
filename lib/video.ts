/**
 * 동영상 — 올리기 전에 이 컴퓨터(크롬)에서 720p 로 줄여서 올림 (저장 공간 아끼려고)
 * - 30초 영상 ≈ 5~8MB. 줄이는 데 영상 길이만큼 걸림 (화면에서 한 번 재생하며 다시 녹화하는 방식)
 * - 1분 넘는 영상은 안 받음. 이미 8MB 이하로 작은 영상은 그대로 올림
 * - 저장 위치: purchase-images/<system>/... (사진과 같은 저장소)
 */
import { supabase } from '@/lib/supabase';

const BUCKET = 'purchase-images';
export const VIDEO_MAX_SEC = 60;
const SMALL_ENOUGH = 8 * 1024 * 1024;
const MAX_SIDE = 1280; // 720p
const BITRATE = 1_400_000; // 약 1.4Mbps

export function isVideoUrl(u?: string | null): boolean {
  return !!u && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
}
export function isVideoFile(f: Blob): boolean {
  return f.type.startsWith('video/');
}

function pickMime(): { mime: string; ext: string } {
  const cands = [
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  for (const c of cands) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) return c;
  return { mime: '', ext: 'webm' };
}

function loadMeta(file: Blob): Promise<{ v: HTMLVideoElement; url: string }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'auto';
    v.playsInline = true;
    v.src = url;
    v.onloadedmetadata = () => {
      if (isFinite(v.duration)) { res({ v, url }); return; }
      // 일부 webm 은 길이 정보가 없음 → 끝으로 한 번 보내서 길이를 알아낸 뒤 처음으로
      v.ontimeupdate = () => {
        v.ontimeupdate = null;
        v.currentTime = 0;
        v.onseeked = () => { v.onseeked = null; res({ v, url }); };
      };
      v.currentTime = 1e101;
    };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이 동영상은 열 수 없어요 (형식 확인)')); };
  });
}

/** 영상 길이(초) */
export async function videoDuration(file: Blob): Promise<number> {
  const { v, url } = await loadMeta(file);
  const d = v.duration;
  URL.revokeObjectURL(url);
  return d;
}

/**
 * 720p 로 줄이기. onProgress(0~1). 결과: { blob, ext }
 * 작거나 줄이기를 못 하는 브라우저면 원본 그대로 돌려줌
 */
export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const origExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const { v, url } = await loadMeta(file);
  try {
    if (!isFinite(v.duration) || v.duration > VIDEO_MAX_SEC + 0.5) {
      throw new Error(`동영상은 ${VIDEO_MAX_SEC}초까지만 올릴 수 있어요 (지금 ${Math.round(v.duration)}초)`);
    }
    const { mime, ext } = pickMime();
    if (file.size <= SMALL_ENOUGH || !mime || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
      onProgress?.(1);
      return { blob: file, ext: ['mp4', 'webm', 'mov', 'm4v'].includes(origExt) ? origExt : 'mp4' };
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round((v.videoWidth * scale) / 2) * 2;
    const h = Math.round((v.videoHeight * scale) / 2) * 2;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d')!;
    const stream = canvas.captureStream(30);

    // 소리: 스피커로는 안 내보내고 녹화에만 넣음
    let ac: AudioContext | null = null;
    try {
      ac = new AudioContext();
      const src = ac.createMediaElementSource(v);
      const dest = ac.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch { /* 소리 없이 */ }

    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE, audioBitsPerSecond: 96_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<void>(r => { rec.onstop = () => r(); });

    let raf = 0;
    const draw = () => {
      g.drawImage(v, 0, 0, w, h);
      onProgress?.(Math.min(0.99, v.currentTime / v.duration));
      if (!v.ended && !v.paused) raf = requestAnimationFrame(draw);
    };
    rec.start(1000);
    v.currentTime = 0;
    await v.play();
    draw();
    await new Promise<void>(r => { v.onended = () => r(); });
    cancelAnimationFrame(raf);
    g.drawImage(v, 0, 0, w, h);
    rec.stop();
    await done;
    stream.getTracks().forEach(t => t.stop());
    try { await ac?.close(); } catch { /* 무시 */ }
    const out = new Blob(chunks, { type: mime.split(';')[0] });
    onProgress?.(1);
    // 줄였는데 오히려 크면 원본
    return out.size > 0 && out.size < file.size ? { blob: out, ext } : { blob: file, ext: origExt };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 저장소에 올리고 공개 주소 */
export async function uploadVideoBlob(folder: string, blob: Blob, ext: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const type = blob.type || (ext === 'webm' ? 'video/webm' : 'video/mp4');
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
