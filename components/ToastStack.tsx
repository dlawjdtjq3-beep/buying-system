'use client';

import { useEffect, useState } from 'react';
import { thumbUrl } from '@/lib/image';
import { playDingDong } from '@/lib/sound';
import { ALERT_TITLE, type AlertKind, type PhotoRow as BaseRow } from '@/lib/notify';

type PhotoRow = BaseRow & { kind?: AlertKind };

/**
 * 화면 오른쪽 빈칸에 뜨는 알림 (사진 등록 · 채팅 새 글) — 띵동 소리와 함께 떴다가 사라짐
 * - 'buying-photo' 이벤트: lib/notify.ts emitPhotoToast
 * - 'buying-chat'  이벤트: components/ChatPanel.tsx
 */
interface ChatMsg { id: number; author: string; body: string; created_at: string }
type T =
  | { kind: 'photo'; at: number; r: PhotoRow; self?: boolean }
  | { kind: 'chat'; at: number; m: ChatMsg };

const LIFE = 10000; // 10초 뒤 사라짐

function hhmm(s: string) {
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ToastStack() {
  const [items, setItems] = useState<T[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  useEffect(() => {
    let seq = 0;
    const push = (t: T) => {
      setItems(prev => [t, ...prev].slice(0, 5));
      setTimeout(() => setLeaving(prev => new Set(prev).add(t.at)), LIFE - 400);
      setTimeout(() => {
        setItems(prev => prev.filter(x => x.at !== t.at));
        setLeaving(prev => { const n = new Set(prev); n.delete(t.at); return n; });
      }, LIFE);
    };
    const onPhoto = (e: Event) => {
      const d = (e as CustomEvent).detail as PhotoRow & { self?: boolean };
      push({ kind: 'photo', at: Date.now() + (seq++) / 1000, r: d, self: d.self });
      if (!d.self) playDingDong();
    };
    const onChat = (e: Event) => {
      const m = (e as CustomEvent).detail as ChatMsg;
      push({ kind: 'chat', at: Date.now() + (seq++) / 1000, m });
      playDingDong();
    };
    window.addEventListener('buying-photo', onPhoto);
    window.addEventListener('buying-chat', onChat);
    return () => {
      window.removeEventListener('buying-photo', onPhoto);
      window.removeEventListener('buying-chat', onChat);
    };
  }, []);

  const close = (at: number) => setItems(prev => prev.filter(x => x.at !== at));

  if (items.length === 0) return null;
  return (
    <div className="toast-stack fixed right-4 top-[72px] z-[60] w-[320px] max-w-[calc(100vw-32px)] space-y-2 pointer-events-none">
      <style>{`@keyframes buyingToastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}`}</style>
      {items.map(t => (
        <button
          key={t.at}
          type="button"
          onClick={() => {
            close(t.at);
            if (t.kind === 'chat') window.dispatchEvent(new CustomEvent('buying-chat-open'));
          }}
          style={{ animation: 'buyingToastIn .25s ease-out' }}
          className={`pointer-events-auto w-full text-left flex gap-3 items-center p-3 rounded-xl bg-white shadow-xl border transition-all duration-300 ${
            t.kind === 'chat' ? 'border-sky-200 hover:bg-sky-50' : 'border-indigo-200 hover:bg-indigo-50'
          } ${leaving.has(t.at) ? 'opacity-0 translate-x-8' : 'opacity-100'}`}
        >
          {t.kind === 'photo' ? (
            <>
              {t.r.image_url ? (
                <img src={thumbUrl(t.r.image_url, 96)} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded bg-indigo-50 flex items-center justify-center shrink-0">📷</div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-indigo-700">
                  {ALERT_TITLE[t.r.kind || 'photo']} <span className="text-gray-900">#{t.r.application_number}</span>
                </div>
                <div className="text-[12px] text-gray-600 truncate">
                  {[t.r.applicant, t.r.product_name, t.r.amount ? `¥${Number(t.r.amount).toLocaleString()}` : ''].filter(Boolean).join(' · ')}
                </div>
                {t.self && <div className="text-[11px] text-gray-400">내가 등록함</div>}
              </div>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-[18px]">💬</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-sky-700">
                  {t.m.author || '직원'} <span className="font-normal text-gray-400 text-[11px]">{hhmm(t.m.created_at)}</span>
                </div>
                <div className="text-[12px] text-gray-700 line-clamp-2 whitespace-pre-wrap break-words">{t.m.body || '📷 사진'}</div>
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
