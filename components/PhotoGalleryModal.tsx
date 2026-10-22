'use client';

/**
 * 사진 등록 창 (엘라) — 여러 장 끌어놓기·붙여넣기·파일선택, 맨 앞 = 대표사진
 * 저장하면 onSaved(대표사진 주소) 를 부름. 상태 변경은 부른 쪽에서 함.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Purchase } from '@/types/purchase';
import { fileToDataUrl, listGallery, removeGalleryPhotos, uploadGalleryPhoto } from '@/lib/gallery';

type Item = { key: string; url?: string; dataUrl?: string };

let seq = 0;
const k = () => `i${Date.now()}-${seq++}`;

export default function PhotoGalleryModal({
  purchase,
  onClose,
  onSaved,
}: {
  readonly purchase: Purchase;
  readonly onClose: () => void;
  readonly onSaved: (mainUrl: string | null) => Promise<void> | void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [over, setOver] = useState(false);
  const removed = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // 열 때: 이 건에 이미 있는 사진들 (대표사진 맨 앞)
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await listGallery(purchase.id);
      const main = purchase.imageUrl && !purchase.imageUrl.startsWith('data:') ? purchase.imageUrl : '';
      const urls = main ? [main, ...saved.filter(u => u.split('?')[0] !== main.split('?')[0])] : saved;
      if (alive) {
        setItems(urls.map(u => ({ key: k(), url: u })));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [purchase.id, purchase.imageUrl]);

  const addBlobs = useCallback(async (blobs: Blob[]) => {
    const imgs = blobs.filter(b => b.type.startsWith('image/'));
    if (imgs.length === 0) return;
    const big = imgs.filter(b => b.size > 20 * 1024 * 1024).length;
    const ok = imgs.filter(b => b.size <= 20 * 1024 * 1024);
    const urls = await Promise.all(ok.map(fileToDataUrl));
    setItems(prev => [...prev, ...urls.map(d => ({ key: k(), dataUrl: d }))]);
    setMsg(big ? `20MB 넘는 사진 ${big}장은 뺐어요` : '');
  }, []);

  // 창이 떠 있는 동안 Ctrl+V 로 붙여넣기
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items || [])
        .filter(i => i.type.startsWith('image/'))
        .map(i => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) { e.preventDefault(); addBlobs(files); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey); };
  }, [addBlobs, onClose, saving]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) return addBlobs(files);
    // 웹페이지에서 사진을 끌어온 경우 — 주소로 받아봄 (사이트가 막으면 실패)
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && /^https?:\/\//.test(url)) {
      try {
        const r = await fetch(url);
        const b = await r.blob();
        if (!b.type.startsWith('image/')) throw new Error('not image');
        await addBlobs([b]);
      } catch {
        setMsg('이 사이트 사진은 바로 못 가져와요. 사진을 복사(Ctrl+C)해서 Ctrl+V 로 붙여넣어 주세요.');
      }
    }
  };

  const makeMain = (key: string) =>
    setItems(prev => { const it = prev.find(x => x.key === key)!; return [it, ...prev.filter(x => x.key !== key)]; });
  const remove = (key: string) =>
    setItems(prev => {
      const it = prev.find(x => x.key === key);
      if (it?.url) removed.current.push(it.url);
      return prev.filter(x => x.key !== key);
    });

  const save = async () => {
    if (items.length === 0) { setMsg('사진을 한 장 이상 넣어주세요'); return; }
    setSaving(true);
    setMsg('');
    try {
      const out: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        out.push(it.url ?? (await uploadGalleryPhoto(purchase.id, it.dataUrl!, i)));
      }
      if (removed.current.length) await removeGalleryPhotos(purchase.id, removed.current);
      await onSaved(out[0] ?? null);
      onClose();
    } catch (err: any) {
      setMsg('저장 실패: ' + (err?.message || '다시 시도해 주세요'));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="w-full max-w-[720px] bg-white rounded-xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[15px] font-semibold text-gray-900">
            #{purchase.applicationNumber} 사진 등록 <span className="text-gray-400 font-normal">· {purchase.productName}</span>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-700 text-lg px-1">✕</button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border border-dashed rounded-lg px-4 py-4 text-center text-[13px] cursor-pointer mb-3 ${over ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
        >
          ⬆ 위챗·폴더에서 <b>여러 장 끌어놓기</b> · <b>Ctrl+V</b> 붙여넣기 · 눌러서 파일 선택
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { addBlobs(Array.from(e.target.files || [])); e.target.value = ''; }}
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-[13px] text-gray-400">사진 불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-gray-400">아직 사진이 없어요</div>
        ) : (
          <div className="grid grid-cols-5 gap-2 mb-2">
            {items.map((it, i) => (
              <div
                key={it.key}
                onClick={() => makeMain(it.key)}
                title={i === 0 ? '대표사진' : '누르면 대표사진으로'}
                className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer ${i === 0 ? 'ring-2 ring-indigo-500' : 'ring-1 ring-gray-200 hover:ring-gray-400'}`}
              >
                <img src={it.dataUrl || it.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 text-[11px] px-1.5 py-[1px] rounded bg-indigo-600 text-white">대표</span>}
                {!it.url && <span className="absolute bottom-1 left-1 text-[10px] px-1 rounded bg-emerald-600 text-white">새 사진</span>}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(it.key); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white text-[11px] leading-5"
                  aria-label="사진 빼기"
                >✕</button>
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/55 text-white"
                  >크게</a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-[12px] text-gray-500 mb-3">
          맨 앞 사진이 대표사진(목록 썸네일)이에요. 다른 사진을 누르면 그 사진이 대표가 돼요. 사진 {items.length}장
        </div>
        {msg && <div className="text-[12px] text-red-600 mb-3">{msg}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 px-4 rounded-md bg-gray-100 text-gray-700 text-sm">취소</button>
          <button type="button" onClick={save} disabled={saving || loading} className="h-9 px-6 rounded-md bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? '저장 중…' : '사진 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
