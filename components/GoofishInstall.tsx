'use client';

import { useState } from 'react';
import { bookmarkletCode } from '@/lib/goofish';

/** 闲鱼 → 구매등록 즐겨찾기 버튼 설치 안내 */
export default function GoofishInstall() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
      >
        🐟 闲鱼 버튼
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-[340px] bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-[13px] text-gray-700">
          <div className="font-semibold text-gray-900 mb-2">闲鱼 → 구매등록 버튼 설치</div>
          <ol className="list-decimal pl-4 space-y-1.5 mb-3">
            <li>즐겨찾기 바가 안 보이면 <b>Ctrl+Shift+B</b></li>
            <li>아래 노란 버튼을 <b>즐겨찾기 바로 끌어다 놓기</b></li>
            <li>闲鱼 상품 페이지에서 그 버튼 누르기 → 등록 화면이 채워져서 열림</li>
          </ol>
          <div className="flex justify-center py-2">
            <a
              // React 는 javascript: 주소를 막으므로 직접 넣습니다
              ref={el => { if (el) el.setAttribute('href', bookmarkletCode(window.location.origin + window.location.pathname)); }}
              onClick={e => { e.preventDefault(); alert('누르지 말고 즐겨찾기 바로 끌어다 놓으세요'); }}
              className="inline-block px-4 py-2 rounded-full bg-yellow-400 text-gray-900 font-bold shadow cursor-grab select-none"
            >
              闲鱼→구매등록
            </a>
          </div>
          <div className="text-[11px] text-gray-400 mt-2">
            제품명·금액·카테고리·사진을 채워주기만 하고, 저장은 확인 후 «등록하기»를 눌러야 됩니다.
          </div>
        </div>
      )}
    </div>
  );
}
