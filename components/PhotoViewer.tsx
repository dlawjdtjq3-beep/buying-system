'use client';

/**
 * 큰 사진 보기 — 목록 썸네일을 누르면 화면 가운데 크게
 * ← → (또는 화면 양옆 화살표): 이 건의 사진을 넘기고, 끝나면 앞/뒤 건으로 넘어감
 * Esc / 바깥 클릭: 닫기
 */
import { useEffect, useState } from 'react';
import { Purchase } from '@/types/purchase';
import { listGallery } from '@/lib/gallery';
import { thumbUrl } from '@/lib/image';

const cache = new Map<string, string[]>();

async function photosOf(p: Purchase, withGallery: boolean): Promise<string[]> {
  const main = p.imageUrl || p.imageData || '';
  if (!withGallery) return main ? [main] : [];
  if (!cache.has(p.id)) {
    const g = await listGallery(p.id);
    const base = main.split('?')[0];
    cache.set(p.id, main ? [main, ...g.filter(u => u.split('?')[0] !== base)] : g);
  }
  return cache.get(p.id)!;
}

/** 사진 창에서 저장하면 그 건 캐시를 지워 새로 읽게 함 */
export function forgetPhotos(id: string) {
  cache.delete(id);
}

export default function PhotoViewer({
  list,
  start,
  startPhoto,
  withGallery,
  onClose,
  onEdit,
}: {
  readonly list: Purchase[];           // 지금 화면 목록 (사진 있는 건만)
  readonly start: number;              // 처음 연 건의 위치
  readonly startPhoto?: string;        // 처음 연 건에서 이 사진부터
  readonly withGallery: boolean;       // 엘라: 여러 장 / VMCE: 대표 1장
  readonly onClose: () => void;
  readonly onEdit?: (p: Purchase) => void;
}) {
  const [pi, setPi] = useState(start);           // 몇 번째 건
  const [photos, setPhotos] = useState<string[]>([]);
  const [ix, setIx] = useState(0);               // 그 건의 몇 번째 사진
  const [goLast, setGoLast] = useState(false);   // 앞 건으로 넘어갈 땐 그 건의 마지막 사진부터
  const [firstPick, setFirstPick] = useState(startPhoto || '');
  const p = list[pi];
  // 확대: 사진을 누르면 2.5배, 마우스 움직이는 곳을 따라 봄. 다시 누르면 원래대로
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  useEffect(() => { setZoom(false); }, [pi, ix]);
  const track = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  useEffect(() => {
    let alive = true;
    if (!p) return;
    photosOf(p, withGallery).then(ph => {
      if (!alive) return;
      setPhotos(ph);
      const want = firstPick ? ph.findIndex(u => u.split('?')[0] === firstPick.split('?')[0]) : -1;
      setIx(want >= 0 ? want : goLast ? Math.max(0, ph.length - 1) : 0);
      if (firstPick) setFirstPick('');
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, withGallery, goLast]);

  const next = () => {
    if (ix < photos.length - 1) setIx(ix + 1);
    else if (pi < list.length - 1) { setGoLast(false); setPi(pi + 1); }
  };
  const prev = () => {
    if (ix > 0) setIx(ix - 1);
    else if (pi > 0) { setGoLast(true); setPi(pi - 1); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 다음 사진 미리 받아두기 (넘길 때 바로 뜨게)
  useEffect(() => {
    const n = photos[ix + 1];
    if (n) { const im = new Image(); im.src = n; }
  }, [photos, ix]);

  if (!p) return null;
  const src = photos[ix];
  const atStart = pi === 0 && ix === 0;
  const atEnd = pi === list.length - 1 && ix >= photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center select-none"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 text-white text-[14px]">
        <div>
          <span className="font-semibold">#{p.applicationNumber}</span>
          <span className="text-white/70"> · {p.productName}</span>
          {photos.length > 0 && <span className="ml-3 text-white/70">{ix + 1} / {photos.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button type="button" onClick={() => onEdit(p)} className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-[13px]">
              📷 사진 추가·대표 변경
            </button>
          )}
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25" aria-label="닫기">✕</button>
        </div>
      </div>

      <button
        type="button"
        onClick={prev}
        disabled={atStart}
        className="absolute z-10 left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl disabled:opacity-20"
        aria-label="이전"
      >‹</button>

      {src ? (
        <div className="w-[94vw] h-[84vh] flex items-center justify-center overflow-hidden">
          <img
            src={src}
            alt=""
            draggable={false}
            onClick={(e) => { track(e); setZoom(z => !z); }}
            onMouseMove={(e) => { if (zoom) track(e); }}
            style={{ transform: zoom ? 'scale(2.5)' : 'none', transformOrigin: origin }}
            className={`w-full h-full object-contain transition-transform duration-150 ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          />
        </div>
      ) : (
        <div className="text-white/60 text-[14px]">사진 불러오는 중…</div>
      )}

      <button
        type="button"
        onClick={next}
        disabled={atEnd}
        className="absolute z-10 right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl disabled:opacity-20"
        aria-label="다음"
      >›</button>

      {photos.length > 1 && (
        <div className="absolute z-10 bottom-4 flex gap-2">
          {photos.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setIx(i)}
              className={`w-12 h-12 rounded overflow-hidden ${i === ix ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
            >
              <img src={thumbUrl(u, 96)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="absolute bottom-1 right-3 text-[11px] text-white/40">사진 누르면 확대 · ← → 넘기기 · Esc 닫기</div>
    </div>
  );
}
