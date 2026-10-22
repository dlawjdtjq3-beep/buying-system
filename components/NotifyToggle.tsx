'use client';

import { useEffect, useState } from 'react';
import { thumbUrl } from '@/lib/image';
import { NotifyState, PhotoRow, notifyState, turnOffNotify, turnOnNotify } from '@/lib/notify';

type Toast = PhotoRow & { self?: boolean; at: number };

/** 상단 [🔔 알림] 버튼 — «사진 등록» 크롬 알림 켜고 끄기 */
export default function NotifyToggle() {
  const [st, setSt] = useState<NotifyState>('off');
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => setSt(notifyState()), []);

  // «사진 등록» 알림창 — 버튼 바로 밑에 쌓이고 15초 뒤 사라짐 (누르면 바로 닫힘)
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as PhotoRow & { self?: boolean };
      const t: Toast = { ...d, at: Date.now() };
      setToasts(prev => [t, ...prev.filter(x => x.id !== d.id)].slice(0, 5));
      setTimeout(() => setToasts(prev => prev.filter(x => x.at !== t.at)), 15000);
    };
    window.addEventListener('buying-photo', on);
    return () => window.removeEventListener('buying-photo', on);
  }, []);

  const toastBox = toasts.length > 0 && (
    <div className="absolute right-0 top-10 z-50 w-[300px] space-y-2">
      {toasts.map(t => (
        <button
          key={t.at}
          type="button"
          onClick={() => setToasts(prev => prev.filter(x => x.at !== t.at))}
          className="w-full text-left flex gap-3 items-center p-3 rounded-lg bg-white border border-indigo-200 shadow-lg hover:bg-indigo-50"
        >
          {t.image_url ? (
            <img src={thumbUrl(t.image_url, 96)} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded bg-indigo-50 flex items-center justify-center shrink-0">📷</div>
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-indigo-700">
              📷 사진 등록됐어요 <span className="text-gray-900">#{t.application_number}</span>
            </div>
            <div className="text-[12px] text-gray-600 truncate">
              {[t.applicant, t.product_name, t.amount ? `¥${Number(t.amount).toLocaleString()}` : ''].filter(Boolean).join(' · ')}
            </div>
            {t.self && <div className="text-[11px] text-gray-400">내가 등록함</div>}
          </div>
        </button>
      ))}
    </div>
  );

  if (st === 'unsupported') return <div className="relative">{toastBox}</div>;

  const label = st === 'on' ? '🔔 알림 켜짐' : st === 'blocked' ? '🔕 알림 차단됨' : '🔕 알림 꺼짐';
  const cls =
    st === 'on'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50';

  return (
    <div className="relative">
    <button
      type="button"
      title={
        st === 'blocked'
          ? '크롬이 이 사이트 알림을 막고 있어요. 주소창 왼쪽 자물쇠 → 알림 → 허용'
          : '«사진 등록»이 되면 크롬 알림으로 알려줍니다 (이 탭이 열려 있을 때)'
      }
      onClick={async () => {
        if (st === 'on') setSt(turnOffNotify());
        else if (st === 'blocked') alert('크롬이 이 사이트 알림을 막고 있어요.\n\n주소창 왼쪽 자물쇠(사이트 정보) → 알림 → «허용»으로 바꾼 뒤 새로고침하세요.');
        else setSt(await turnOnNotify());
      }}
      className={`px-3 py-1.5 rounded-md text-[13px] font-medium border ${cls}`}
    >
      {label}
    </button>
    {toastBox}
    </div>
  );
}
