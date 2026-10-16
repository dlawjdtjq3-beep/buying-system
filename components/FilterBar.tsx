'use client';

import { useEffect, useState } from 'react';
import { Purchase, ProductCategory } from '@/types/purchase';
import { Period, PeriodUnit, periodLabel, shiftPeriod, todayStr } from '@/lib/period';
import { DELIVERY_STEPS } from '@/lib/delivery';

type PurchaseStatus = Purchase['purchaseStatus'];
type DeliveryStatus = Purchase['deliveryStatus'];

interface FilterBarProps {
  /** 기간 필터가 걸린 목록 (건수 표시용) */
  readonly purchases: Purchase[];
  /** 전체 목록 (NEW 표시용) */
  readonly allPurchases: Purchase[];
  readonly period: Period;
  readonly onPeriod: (p: Period) => void;
  readonly selectedCategory: ProductCategory | null;
  readonly onCategory: (v: ProductCategory | null) => void;
  readonly selectedPurchaseStatus: PurchaseStatus | null;
  readonly onPurchaseStatus: (v: PurchaseStatus | null) => void;
  readonly selectedDeliveryStatus: DeliveryStatus | null;
  readonly onDeliveryStatus: (v: DeliveryStatus | null) => void;
}

const PURCHASE_STATUSES: readonly PurchaseStatus[] = ['미구매', '사진 등록', '구매원함', '구매완료', '품절'];
const DELIVERY_STATUSES: readonly DeliveryStatus[] = DELIVERY_STEPS;
const CATEGORIES: readonly ProductCategory[] = ['가방', '악세사리', '의류', '신발', '시계', '기타', '유지비용'];

const PERIODS: { unit: PeriodUnit; label: string }[] = [
  { unit: 'recent', label: '최근 1개월' },
  { unit: 'week', label: '주별' },
  { unit: 'month', label: '월별' },
  { unit: 'year', label: '년별' },
  { unit: 'older', label: '1개월 이전' },
  { unit: 'all', label: '전체' },
];

// ── NEW 표시 ──
// 칩마다 «마지막으로 눌러 본 시각»을 이 브라우저에 기억해 두고, 그 뒤에 등록(또는 변경)된 건이 있으면 NEW.
// 사람·컴퓨터마다 따로 기억합니다. 처음 들어온 브라우저는 «지금»부터 셉니다.
const SEEN_KEY = `buying-seen-v1:${process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella'}`;
type SeenMap = Record<string, number>;

function loadSeen(): SeenMap {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (raw) return JSON.parse(raw);
    const init = { __base: Date.now() };
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(init));
    return init;
  } catch {
    return { __base: Date.now() };
  }
}

const stampOf = (p: Purchase) => Math.max(p.updatedAt || 0, p.createdAt || 0);

/** 선택 여부에 따라 칩 색을 고릅니다. */
function chipClass(active: boolean, tone: 'green' | 'blue' | 'purple' | 'slate') {
  if (!active) {
    return 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50';
  }
  const tones = {
    green: 'bg-emerald-600 text-white border-emerald-600',
    blue: 'bg-blue-600 text-white border-blue-600',
    purple: 'bg-violet-600 text-white border-violet-600',
    slate: 'bg-slate-800 text-white border-slate-800',
  } as const;
  return tones[tone];
}

const chipBase = 'relative px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors';

function Row<T extends string>({
  label,
  values,
  counts,
  newCounts,
  selected,
  onSelect,
  tone,
}: {
  readonly label: string;
  readonly values: readonly T[];
  readonly counts: Record<string, number>;
  readonly newCounts: Record<string, number>;
  readonly selected: T | null;
  readonly onSelect: (v: T | null) => void;
  readonly tone: 'green' | 'blue' | 'purple';
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-[64px] shrink-0 pt-1 text-[12px] font-semibold text-gray-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`${chipBase} ${chipClass(selected === null, tone)}`}
        >
          전체
        </button>
        {values.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(selected === v ? null : v)}
            className={`${chipBase} ${chipClass(selected === v, tone)}`}
          >
            {v}
            <span className={`ml-1.5 ${selected === v ? 'opacity-80' : 'text-gray-400'}`}>{counts[v] ?? 0}</span>
            {(newCounts[v] ?? 0) > 0 && (
              <span className="absolute -top-2 -right-1.5 px-1.5 py-[1px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-tight shadow-sm">
                NEW {newCounts[v]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterBar({
  purchases,
  allPurchases,
  period,
  onPeriod,
  selectedCategory,
  onCategory,
  selectedPurchaseStatus,
  onPurchaseStatus,
  selectedDeliveryStatus,
  onDeliveryStatus,
}: FilterBarProps) {
  const [seen, setSeen] = useState<SeenMap | null>(null);
  useEffect(() => setSeen(loadSeen()), []);

  const markSeen = (key: string) => {
    setSeen(prev => {
      const next = { ...(prev || {}), [key]: Date.now() };
      try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
      return next;
    });
  };

  const countBy = (list: Purchase[], pick: (p: Purchase) => string) =>
    list.reduce<Record<string, number>>((acc, p) => {
      const k = pick(p);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

  const newBy = (prefix: string, pick: (p: Purchase) => string) => {
    if (!seen) return {};
    return allPurchases.reduce<Record<string, number>>((acc, p) => {
      const k = pick(p);
      const since = seen[`${prefix}:${k}`] ?? seen.__base ?? Date.now();
      if (stampOf(p) > since) acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  };

  const purchaseCounts = countBy(purchases, p => p.purchaseStatus);
  const deliveryCounts = countBy(purchases, p => p.deliveryStatus);
  const categoryCounts = countBy(purchases, p => p.category);

  const hasFilter = selectedCategory || selectedPurchaseStatus || selectedDeliveryStatus;
  const navigable = period.unit === 'week' || period.unit === 'month' || period.unit === 'year';

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-1 mb-4">
      {/* 기간 */}
      <div className="flex items-start gap-3 py-2.5">
        <div className="w-[64px] shrink-0 pt-1 text-[12px] font-semibold text-gray-500">기간</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map(o => (
            <button
              key={o.unit}
              type="button"
              onClick={() => onPeriod({ unit: o.unit, anchor: todayStr() })}
              className={`${chipBase} ${chipClass(period.unit === o.unit, 'slate')}`}
            >
              {o.label}
            </button>
          ))}
          {navigable && (
            <div className="flex items-center gap-1 ml-2">
              <button type="button" onClick={() => onPeriod(shiftPeriod(period, -1))}
                className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px]">◀</button>
              <span className="min-w-[96px] text-center text-[13px] font-semibold text-gray-800">{periodLabel(period)}</span>
              <button type="button" onClick={() => onPeriod(shiftPeriod(period, 1))}
                className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px]">▶</button>
            </div>
          )}
          <span className="ml-2 text-[12px] text-gray-400">{purchases.length.toLocaleString()}건</span>
        </div>
      </div>
      <div className="border-t border-gray-100" />
      <Row
        label="구매여부"
        values={PURCHASE_STATUSES}
        counts={purchaseCounts}
        newCounts={newBy('p', p => p.purchaseStatus)}
        selected={selectedPurchaseStatus}
        onSelect={v => { if (v) markSeen(`p:${v}`); onPurchaseStatus(v); }}
        tone="green"
      />
      <div className="border-t border-gray-100" />
      <Row
        label="배송단계"
        values={DELIVERY_STATUSES}
        counts={deliveryCounts}
        newCounts={newBy('d', p => p.deliveryStatus)}
        selected={selectedDeliveryStatus}
        onSelect={v => { if (v) markSeen(`d:${v}`); onDeliveryStatus(v); }}
        tone="blue"
      />
      <div className="border-t border-gray-100" />
      <Row
        label="카테고리"
        values={CATEGORIES}
        counts={categoryCounts}
        newCounts={newBy('c', p => p.category)}
        selected={selectedCategory}
        onSelect={v => { if (v) markSeen(`c:${v}`); onCategory(v); }}
        tone="purple"
      />
      {hasFilter && (
        <div className="border-t border-gray-100 py-2.5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onCategory(null);
              onPurchaseStatus(null);
              onDeliveryStatus(null);
            }}
            className="text-[12px] text-gray-500 hover:text-gray-800 underline underline-offset-2"
          >
            필터 모두 지우기
          </button>
        </div>
      )}
    </div>
  );
}
