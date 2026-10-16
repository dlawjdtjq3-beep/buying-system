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
