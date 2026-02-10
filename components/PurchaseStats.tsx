'use client';

import { Purchase, ProductCategory } from '@/types/purchase';
import { formatYuan, formatKRW, convertToKRW } from '@/lib/utils';

interface PurchaseStatsProps {
  readonly purchases: Purchase[];
  readonly balance?: number;
  readonly onCategoryFilter?: (category: ProductCategory | null) => void;
  readonly selectedCategory?: ProductCategory | null;
  readonly onPurchaseStatusFilter?: (status: '구매완료' | '미구매' | null) => void;
  readonly selectedPurchaseStatus?: '구매완료' | '미구매' | null;
  readonly onDeliveryStatusFilter?: (status: '출고예정' | '출고' | '출고완료' | null) => void;
  readonly selectedDeliveryStatus?: '출고예정' | '출고' | '출고완료' | null;
}

export default function PurchaseStats({ 
  purchases,
  balance,
  onCategoryFilter, 
  selectedCategory,
  onPurchaseStatusFilter,
  selectedPurchaseStatus,
  onDeliveryStatusFilter,
  selectedDeliveryStatus
}: PurchaseStatsProps) {
  if (purchases.length === 0) return null;

  // 구매완료 + 결제방법 선택된 항목만 총 금액에 포함
  const completedPurchases = purchases.filter(
    p => p.purchaseStatus === '구매완료' && p.paymentMethod
  );
  const totalAmount = completedPurchases.reduce((sum, p) => sum + p.amount, 0);
  const totalKRW = convertToKRW(totalAmount);
  
  // 결제방법별 금액 계산
  const cardAmount = completedPurchases
    .filter(p => p.paymentMethod === '카드')
    .reduce((sum, p) => sum + p.amount, 0);
  const chargeAmount = completedPurchases
    .filter(p => p.paymentMethod === '충전금액')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const purchasedCount = purchases.filter(p => p.purchaseStatus === '구매완료').length;
  const pendingCount = purchases.filter(p => p.purchaseStatus === '미구매').length;
  const deliveredCount = purchases.filter(p => p.deliveryStatus === '출고완료').length;
  const shippingCount = purchases.filter(p => p.deliveryStatus === '출고').length;
  const scheduledCount = purchases.filter(p => p.deliveryStatus === '출고예정').length;
  
  const categoryStats = purchases.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-sm text-gray-500 mb-1">전체 항목</div>
        <div className="text-2xl font-bold text-gray-900">{purchases.length}건</div>
      </div>
      
      {balance !== undefined && (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md p-4 text-white">
          <div className="text-sm mb-1 opacity-90">💰 충전 잔액</div>
          <div className="text-xl font-bold">{formatYuan(balance)}</div>
          <div className="text-xs mt-1 opacity-75">{formatKRW(convertToKRW(balance))}</div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-sm text-gray-500 mb-1">총 금액 (결제완료)</div>
        <div className="text-xl font-bold text-blue-600">{formatYuan(totalAmount)}</div>
        <div className="text-xs text-gray-500 mt-1">{formatKRW(totalKRW)}</div>
        <div className="flex gap-2 mt-2 text-xs">
          <span className="text-indigo-600">💳 카드 {formatYuan(cardAmount)}</span>
          <span className="text-orange-600">💰 충전 {formatYuan(chargeAmount)}</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-sm text-gray-500 mb-1">
          구매 상태
          {selectedPurchaseStatus && (
            <button
              onClick={() => onPurchaseStatusFilter?.(null)}
              className="ml-2 text-xs text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-sm flex gap-2">
          <button
            onClick={() => onPurchaseStatusFilter?.('구매완료')}
            className={`px-2 py-1 rounded transition-all ${
              selectedPurchaseStatus === '구매완료'
                ? 'bg-green-600 text-white font-bold shadow-lg'
                : 'text-green-600 font-semibold hover:bg-green-50'
            }`}
          >
            완료 {purchasedCount}
          </button>
          <span className="text-gray-400">/</span>
          <button
            onClick={() => onPurchaseStatusFilter?.('미구매')}
            className={`px-2 py-1 rounded transition-all ${
              selectedPurchaseStatus === '미구매'
                ? 'bg-yellow-600 text-white font-bold shadow-lg'
                : 'text-yellow-600 font-semibold hover:bg-yellow-50'
            }`}
          >
            미구매 {pendingCount}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-sm text-gray-500 mb-1">
          배송 단계
          {selectedDeliveryStatus && (
            <button
              onClick={() => onDeliveryStatusFilter?.(null)}
              className="ml-2 text-xs text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <button
            onClick={() => onDeliveryStatusFilter?.('출고완료')}
            className={`px-2 py-0.5 rounded transition-all text-left ${
              selectedDeliveryStatus === '출고완료'
                ? 'bg-blue-600 text-white font-bold shadow-lg'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            완료 {deliveredCount}
          </button>
          <button
            onClick={() => onDeliveryStatusFilter?.('출고')}
            className={`px-2 py-0.5 rounded transition-all text-left ${
              selectedDeliveryStatus === '출고'
                ? 'bg-purple-600 text-white font-bold shadow-lg'
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            출고 {shippingCount}
          </button>
          <button
            onClick={() => onDeliveryStatusFilter?.('출고예정')}
            className={`px-2 py-0.5 rounded transition-all text-left ${
              selectedDeliveryStatus === '출고예정'
                ? 'bg-gray-600 text-white font-bold shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            예정 {scheduledCount}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 col-span-2 md:col-span-4">
        <div className="text-sm text-gray-500 mb-2">
          카테고리별 현황 {selectedCategory && <span className="text-blue-600">(필터링: {selectedCategory})</span>}
          {selectedCategory && (
            <button
              onClick={() => onCategoryFilter?.(null)}
              className="ml-2 text-xs text-red-600 hover:text-red-800"
            >
              ✕ 필터 해제
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryStats).map(([category, count]) => (
            <button
              key={category}
              onClick={() => onCategoryFilter?.(category as ProductCategory)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
              }`}
            >
              {category} <span className="ml-1.5 font-bold">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
