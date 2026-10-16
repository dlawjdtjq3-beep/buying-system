'use client';

import { Purchase, ProductCategory } from '@/types/purchase';

type PurchaseStatus = Purchase['purchaseStatus'];
type DeliveryStatus = Purchase['deliveryStatus'];

interface FilterBarProps {
  readonly purchases: Purchase[];
  readonly selectedCategory: ProductCategory | null;
  readonly onCategory: (v: ProductCategory | null) => void;
  readonly selectedPurchaseStatus: PurchaseStatus | null;
  readonly onPurchaseStatus: (v: PurchaseStatus | null) => void;
  readonly selectedDeliveryStatus: DeliveryStatus | null;
  readonly onDeliveryStatus: (v: DeliveryStatus | null) => void;
}

const PURCHASE_STATUSES: readonly PurchaseStatus[] = ['구매완료', '구매원함', '사진 등록', '미구매', '품절'];
const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['출고예정', '출고', '출고완료', 'CN 미도착', 'CN 도착', '입고완료'];
const CATEGORIES: readonly ProductCategory[] = ['가방', '악세사리', '의류', '신발', '시계', '기타'];

/** 선택 여부에 따라 칩 색을 고릅니다. */
function chipClass(active: boolean, tone: 'green' | 'blue' | 'purple') {
  if (!active) {
    return 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50';
  }
  const tones = {
    green: 'bg-emerald-600 text-white border-emerald-600',
    blue: 'bg-blue-600 text-white border-blue-600',
    purple: 'bg-violet-600 text-white border-violet-600',
  } as const;
  return tones[tone];
}

function Row<T extends string>({
  label,
  values,
  counts,
  selected,
  onSelect,
  tone,
}: {
  readonly label: string;
  readonly values: readonly T[];
  readonly counts: Record<string, number>;
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
          className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${chipClass(selected === null, tone)}`}
        >
          전체
        </button>
        {values.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(selected === v ? null : v)}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${chipClass(selected === v, tone)}`}
          >
            {v}
            <span className={`ml-1.5 ${selected === v ? 'opacity-80' : 'text-gray-400'}`}>{counts[v] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterBar({
  purchases,
  selectedCategory,
  onCategory,
  selectedPurchaseStatus,
  onPurchaseStatus,
  selectedDeliveryStatus,
  onDeliveryStatus,
}: FilterBarProps) {
  const countBy = (pick: (p: Purchase) => string) =>
    purchases.reduce<Record<string, number>>((acc, p) => {
      const k = pick(p);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

  const purchaseCounts = countBy(p => p.purchaseStatus);
  const deliveryCounts = countBy(p => p.deliveryStatus);
  const categoryCounts = countBy(p => p.category);

  const hasFilter = selectedCategory || selectedPurchaseStatus || selectedDeliveryStatus;

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-1 mb-4">
      <Row
        label="구매여부"
        values={PURCHASE_STATUSES}
        counts={purchaseCounts}
        selected={selectedPurchaseStatus}
        onSelect={onPurchaseStatus}
        tone="green"
      />
      <div className="border-t border-gray-100" />
      <Row
        label="배송단계"
        values={DELIVERY_STATUSES}
        counts={deliveryCounts}
        selected={selectedDeliveryStatus}
        onSelect={onDeliveryStatus}
        tone="blue"
      />
      <div className="border-t border-gray-100" />
      <Row
        label="카테고리"
        values={CATEGORIES}
        counts={categoryCounts}
        selected={selectedCategory}
        onSelect={onCategory}
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
