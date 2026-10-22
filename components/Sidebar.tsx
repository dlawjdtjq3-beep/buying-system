'use client';

export type ViewKey = 'list' | 'vendors' | 'charge' | 'monthly' | 'staff';

interface SidebarProps {
  readonly view: ViewKey;
  readonly onChange: (view: ViewKey) => void;
  readonly systemLabel: string;
  readonly counts?: { readonly total?: number };
  readonly isAdmin?: boolean;
  readonly newStaff?: number; // 새로 등록한 직원 수 (직원 관리 옆 NEW)
}

const STAFF_GROUP = {
  label: '관리자',
  items: [
    {
      key: 'staff' as ViewKey,
      name: '직원 관리',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0" />
        </svg>
      ),
    },
  ],
};

const GROUPS: ReadonlyArray<{
  readonly label: string;
  readonly items: ReadonlyArray<{ readonly key: ViewKey; readonly name: string; readonly icon: React.ReactNode }>;
}> = [
  {
    label: '메인',
    items: [
      {
        key: 'list',
        name: '구매 관리',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        ),
      },
      {
        key: 'vendors',
        name: '도매 업체 관리',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: '정산',
    items: [
      {
        key: 'charge',
        name: '충전 관리',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: '통계',
    items: [
      {
        key: 'monthly',
        name: '월별 통계',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V9m5 7V5m5 11v-4M4 20h16" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar({ view, onChange, systemLabel, counts, isAdmin, newStaff }: SidebarProps) {
  const groups = isAdmin ? [...GROUPS, STAFF_GROUP] : GROUPS;
  return (
    <aside className="hidden lg:flex lg:flex-col w-[220px] shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200">
        <span className="text-[15px] font-bold tracking-tight text-gray-900">{systemLabel}</span>
        {/* 엘라 ↔ VMCE 넘어가기 (같은 계정, 주소가 달라 처음 한 번은 로그인) */}
        {(process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella') === 'vmce' ? (
          <a href="https://ella-buy.arsell.co.kr" className="text-[11px] text-gray-400 hover:text-indigo-600 whitespace-nowrap">엘라로 →</a>
        ) : (
          <a href="https://vmce-buy.arsell.co.kr" className="text-[11px] text-gray-400 hover:text-indigo-600 whitespace-nowrap">VMCE로 →</a>
        )}
      </div>

      <nav className="flex-1 py-4">
        {groups.map(group => (
          <div key={group.label} className="mb-5">
            <div className="px-5 mb-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
              {group.label}
            </div>
            {group.items.map(item => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[14px] transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={active ? 'text-indigo-600' : 'text-gray-400'}>{item.icon}</span>
                  <span>{item.name}</span>
                  {item.key === 'staff' && !!newStaff && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold">NEW {newStaff}</span>
                  )}
                  {item.key === 'list' && counts?.total !== undefined && (
                    <span className="ml-auto text-[11px] text-gray-400 font-normal">{counts.total}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** 좁은 화면용 가로 탭 — 사이드바가 숨겨질 때 대신 보입니다. */
export function MobileTabs({ view, onChange, isAdmin, newStaff }: Pick<SidebarProps, 'view' | 'onChange' | 'isAdmin' | 'newStaff'>) {
  const tabs: ReadonlyArray<{ key: ViewKey; name: string }> = [
    { key: 'list', name: '구매 관리' },
    { key: 'vendors', name: '도매 업체' },
    { key: 'charge', name: '충전 관리' },
    { key: 'monthly', name: '월별 통계' },
    ...(isAdmin ? [{ key: 'staff' as ViewKey, name: newStaff ? `직원 NEW${newStaff}` : '직원' }] : []),
  ];
  return (
    <div className="lg:hidden flex border-b border-gray-200 bg-white">
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex-1 py-3 text-[13px] font-medium transition-colors ${
            view === t.key
              ? 'text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
