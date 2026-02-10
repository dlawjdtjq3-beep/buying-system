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
  
  // 총 금액 = 제품금액 + 수수료 + 감정비 + 배송비
  const totalAmount = completedPurchases.reduce((sum, p) => {
    return sum + p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0);
  }, 0);
  const totalKRW = convertToKRW(totalAmount);
  
  // 결제방법별 금액 계산
  const cardAmount = completedPurchases
    .filter(p => p.paymentMethod === '카드')
    .reduce((sum, p) => sum + p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0), 0);
  const chargeAmount = completedPurchases
    .filter(p => p.paymentMethod === '충전금액')
    .reduce((sum, p) => sum + p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0), 0);
  
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* 전체 항목 */}
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 hover:border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          <div className="text-sm font-medium text-gray-600">전체 항목</div>
        </div>
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {purchases.length}건
        </div>
      </div>
      
      {/* 충전 잔액 */}
      {balance !== undefined && (
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-white transform hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
            <div className="text-sm font-semibold opacity-95">충전 잔액</div>
          </div>
          <div className="text-2xl font-bold">{formatYuan(balance)}</div>
          <div className="text-sm mt-1 opacity-90">{formatKRW(convertToKRW(balance))}</div>
        </div>
      )}
      
      {/* 총 금액 */}
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 hover:border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          <div className="text-sm font-medium text-gray-600">총 금액</div>
        </div>
        <div className="text-2xl font-bold text-blue-600">{formatYuan(totalAmount)}</div>
        <div className="text-sm text-gray-500 mt-1">{formatKRW(totalKRW)}</div>
        <div className="flex gap-2 mt-3 text-xs">
          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
            💳 {formatYuan(cardAmount)}
          </span>
          <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg font-medium">
            💰 {formatYuan(chargeAmount)}
          </span>
        </div>
      </div>
      
      {/* 구매 상태 */}
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 hover:border-green-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div className="text-sm font-medium text-gray-600">구매 상태</div>
          </div>
          {selectedPurchaseStatus && (
            <button
              onClick={() => onPurchaseStatusFilter?.(null)}
              className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPurchaseStatusFilter?.('구매완료')}
            className={`flex-1 px-3 py-2 rounded-lg transition-all font-semibold ${
              selectedPurchaseStatus === '구매완료'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            완료 {purchasedCount}
          </button>
          <button
            onClick={() => onPurchaseStatusFilter?.('미구매')}
            className={`flex-1 px-3 py-2 rounded-lg transition-all font-semibold ${
              selectedPurchaseStatus === '미구매'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg transform scale-105'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            대기 {pendingCount}
          </button>
        </div>
      </div>
      
      {/* 배송 단계 */}
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 hover:border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
            </svg>
            <div className="text-sm font-medium text-gray-600">배송 단계</div>
          </div>
          {selectedDeliveryStatus && (
            <button
              onClick={() => onDeliveryStatusFilter?.(null)}
              className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onDeliveryStatusFilter?.('출고완료')}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-semibold text-left ${
              selectedDeliveryStatus === '출고완료'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            ✓ 완료 {deliveredCount}
          </button>
          <button
            onClick={() => onDeliveryStatusFilter?.('출고')}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-semibold text-left ${
              selectedDeliveryStatus === '출고'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            🚚 출고 {shippingCount}
          </button>
          <button
            onClick={() => onDeliveryStatusFilter?.('출고예정')}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-semibold text-left ${
              selectedDeliveryStatus === '출고예정'
                ? 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            📦 예정 {scheduledCount}
          </button>
        </div>
      </div>

      {/* 카테고리별 현황 */}
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 col-span-1 md:col-span-2 lg:col-span-5 border border-gray-100 hover:border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
            </svg>
            <div className="text-sm font-medium text-gray-600">
              카테고리별 현황
              {selectedCategory && (
                <span className="ml-2 text-purple-600 font-semibold">({selectedCategory})</span>
              )}
            </div>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onCategoryFilter?.(null)}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-md'
              }`}
            >
              <span>{category}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                selectedCategory === category
                  ? 'bg-white/30'
                  : 'bg-purple-200'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
