'use client';

import { useEffect, useState } from 'react';
import { NotifyState, notifyState, turnOffNotify, turnOnNotify } from '@/lib/notify';

/**
 * 상단 [🔔 알림] 버튼 — «사진 등록» 크롬(윈도우) 알림 켜고 끄기
 * (화면 안 알림창 + 띵동 소리는 이 버튼과 상관없이 components/ToastStack.tsx 가 항상 띄움)
 */
export default function NotifyToggle() {
  const [st, setSt] = useState<NotifyState>('off');
  useEffect(() => setSt(notifyState()), []);

  if (st === 'unsupported') return null;

  const label = st === 'on' ? '🔔 알림 켜짐' : st === 'blocked' ? '🔕 알림 차단됨' : '🔕 알림 꺼짐';
  const cls =
    st === 'on'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50';

  return (
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
  );
}
