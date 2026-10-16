'use client';

import { useState } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';

type PurchaseStatus = Purchase['purchaseStatus'];
type DeliveryStatus = Purchase['deliveryStatus'];
const BULK_PURCHASE: PurchaseStatus[] = ['미구매', '사진 등록', '구매원함', '구매완료', '품절'];
const BULK_DELIVERY: DeliveryStatus[] = ['출고예정', '출고', '출고완료', 'CN 미도착', 'CN 도착', '입고완료'];
import { formatYuan, formatKRW, convertToKRW } from '@/lib/utils';
import { useFx } from '@/components/FxContext';

interface PurchaseTableProps {
  readonly purchases: Purchase[];
  readonly onEdit: (purchase: Purchase) => void;
  readonly onDelete: (id: string) => void;
  readonly onUpdate: (id: string, data: Partial<PurchaseFormData>) => void;
  readonly isElla?: boolean;
  /** 체크한 건들을 한 번에 바꾸기 (한 건씩 차례로 처리) */
  readonly onBulkUpdate?: (items: { id: string; data: Partial<PurchaseFormData> }[]) => Promise<void>;
}

export default function PurchaseTable({ purchases, onEdit, onDelete, onUpdate, isElla = false, onBulkUpdate }: PurchaseTableProps) {
  const fx = useFx();

  // ── 체크박스 · 일괄 변경 ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPurchase, setBulkPurchase] = useState<PurchaseStatus | ''>('');
  const [bulkDelivery, setBulkDelivery] = useState<DeliveryStatus | ''>('');
  const [busy, setBusy] = useState(false);
  const pageIds = purchases.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selected.has(id));

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev);
      if (allChecked) pageIds.forEach(id => next.delete(id)); else pageIds.forEach(id => next.add(id));
      return next;
    });

  const applyBulk = async () => {
    if (!onBulkUpdate) return;
    const targets = purchases.filter(p => selected.has(p.id));
    if (targets.length === 0) return;

    // 한 줄씩 바꿀 때와 똑같은 내용으로 만듭니다 (결제방법 처리 포함)
    const items = targets.map(p => {
      const data: Partial<PurchaseFormData> = {};
      if (bulkPurchase) {
        data.purchaseStatus = bulkPurchase;
        data.paymentMethod = bulkPurchase === '구매완료' ? p.paymentMethod : undefined;
      }
      if (bulkDelivery) data.deliveryStatus = bulkDelivery;
      return { id: p.id, data };
    });

    // 충전금액 잔액이 움직이는 건 수 (구매원함·구매완료 + 충전금액 ↔ 그 밖)
    const isTarget = (s?: string, m?: string) => (s === '구매원함' || s === '구매완료') && m === '충전금액';
    const moneyMoves = bulkPurchase
      ? targets.filter(p => isTarget(p.purchaseStatus, p.paymentMethod) !== isTarget(bulkPurchase, p.paymentMethod)).length
      : 0;

    const what = [bulkPurchase && `구매여부 → ${bulkPurchase}`, bulkDelivery && `배송단계 → ${bulkDelivery}`].filter(Boolean).join(', ');
    const warn = moneyMoves > 0 ? `\n\n⚠️ 그중 ${moneyMoves}건은 충전금액 결제라 잔액이 차감/복원됩니다.` : '';
    if (!window.confirm(`${targets.length}건을 바꿉니다: ${what}${warn}`)) return;

    setBusy(true);
    try {
      await onBulkUpdate(items);
      setSelected(new Set());
      setBulkPurchase('');
      setBulkDelivery('');
    } finally {
      setBusy(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '구매완료':
        return 'bg-green-100 text-green-800';
      case '구매원함':
        return 'bg-orange-100 text-orange-800';
      case '사진 등록':
        return 'bg-blue-100 text-blue-800';
      case '미구매':
        return 'bg-yellow-100 text-yellow-800';
      case '품절':
        return 'bg-red-100 text-red-800';
      case '입고완료':
        return 'bg-indigo-100 text-indigo-800';
      case '출고완료':
        return 'bg-blue-100 text-blue-800';
      case 'CN 미도착':
        return 'bg-yellow-100 text-yellow-800';
      case 'CN 도착':
        return 'bg-teal-100 text-teal-800';
      case '출고':
        return 'bg-purple-100 text-purple-800';
      case '출고예정':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (purchases.length === 0) {
    return (
      <div className="bg-white p-12 rounded-lg shadow-md text-center">
        <p className="text-gray-500 text-lg">등록된 구매 내역이 없습니다.</p>
        <p className="text-gray-400 mt-2">위 폼을 사용하여 새로운 구매를 등록하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 일괄 변경 바 — 체크한 건이 있을 때만 */}
      {selected.size > 0 && onBulkUpdate && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 text-[13px]">
          <span className="font-semibold text-indigo-800 mr-1">{selected.size}건 선택</span>
          <select
            value={bulkPurchase}
            onChange={(e) => setBulkPurchase(e.target.value as PurchaseStatus | '')}
            className="h-8 px-2 border border-gray-300 rounded-md bg-white text-[13px]"
          >
            <option value="">구매여부 그대로</option>
            {BULK_PURCHASE.filter(s => isElla || s !== '사진 등록').map(s => <option key={s} value={s}>→ {s}</option>)}
          </select>
          <select
            value={bulkDelivery}
            onChange={(e) => setBulkDelivery(e.target.value as DeliveryStatus | '')}
            className="h-8 px-2 border border-gray-300 rounded-md bg-white text-[13px]"
          >
            <option value="">배송단계 그대로</option>
            {BULK_DELIVERY.map(s => <option key={s} value={s}>→ {s}</option>)}
          </select>
          <button
            type="button"
            disabled={busy || (!bulkPurchase && !bulkDelivery)}
            onClick={applyBulk}
            className="h-8 px-4 rounded-md bg-indigo-600 text-white font-semibold disabled:opacity-40 hover:bg-indigo-700"
          >
            {busy ? '바꾸는 중…' : '일괄 적용'}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="h-8 px-3 rounded-md text-gray-600 hover:bg-white"
          >
            선택 해제
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="pl-4 pr-1 py-3 w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-indigo-600 cursor-pointer" title="이 페이지 전체 선택" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">신청번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">신청일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">신청인</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">카테고리</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">사진</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">제품명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">금액</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">구매여부</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">결제방법</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">배송단계</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">운송장번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchases.map((purchase) => (
              <>
              <tr key={purchase.id} className={`transition-colors ${selected.has(purchase.id) ? 'bg-indigo-50/70' : 'hover:bg-gray-50'}`}>
                <td className="pl-4 pr-1 py-3 w-8">
                  <input type="checkbox" checked={selected.has(purchase.id)} onChange={() => toggle(purchase.id)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">#{purchase.applicationNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{purchase.applicationDate}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{purchase.applicant}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex whitespace-nowrap px-2 py-1 text-xs font-semibold rounded-full ${purchase.category === '유지비용' ? 'bg-gray-200 text-gray-700' : 'bg-purple-100 text-purple-800'}`}>
                    {purchase.category}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  {purchase.imageUrl || purchase.imageData ? (
                    <button
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          const src = purchase.imageUrl || purchase.imageData;
                          win.document.write(`<img src="${src}" style="max-width:100%;height:auto;"/>`);
                        }
                      }}
                      className="cursor-pointer inline-block"
                      title="이미지 보기"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={purchase.imageUrl || purchase.imageData}
                          alt={purchase.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <a 
                    href={purchase.productUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {purchase.productName}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {(() => {
                    const taxCalc = fx.taxFor(purchase);
                    const totalYuan = taxCalc.yuan;
                    const isUpkeep = purchase.category === '유지비용';
                    return (
                      <>
                        <div className="font-semibold text-red-600">
                          {formatKRW(taxCalc.totalPayment)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatYuan(totalYuan)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {isUpkeep
                            ? <>유지비용 · 환율 {taxCalc.rate}</>
                            : <>실제금액 {formatKRW(taxCalc.assessmentPrice)} | 관부가세 {formatKRW(taxCalc.totalTax)} | 환율 {taxCalc.rate}</>}
                        </div>
                        {((purchase.commission || 0) + (purchase.appraisalFee || 0) + (purchase.shippingFee || 0)) > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            제품: {formatYuan(purchase.amount)}
                            {(purchase.commission || 0) > 0 && ` + 수수료: ${formatYuan(purchase.commission || 0)}`}
                            {(purchase.appraisalFee || 0) > 0 && ` + 감정비: ${formatYuan(purchase.appraisalFee || 0)}`}
                            {(purchase.shippingFee || 0) > 0 && ` + 배송비: ${formatYuan(purchase.shippingFee || 0)}`}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={purchase.purchaseStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as '구매완료' | '구매원함' | '미구매' | '품절' | '사진 등록';
                      onUpdate(purchase.id, {
                        purchaseStatus: newStatus,
                        paymentMethod: newStatus === '구매완료' ? purchase.paymentMethod : undefined,
                      });
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(purchase.purchaseStatus)}`}
                  >
                    <option value="미구매">미구매</option>
                    <option value="구매원함">구매원함</option>
                    {isElla && <option value="사진 등록">사진 등록</option>}
                    <option value="구매완료">구매완료</option>
                    <option value="품절">품절</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {purchase.purchaseStatus === '구매완료' ? (
                    <select
                      value={purchase.paymentMethod || ''}
                      onChange={(e) => onUpdate(purchase.id, { paymentMethod: (e.target.value || undefined) as '카드' | '충전금액' | undefined })}
                      className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        purchase.paymentMethod === '카드' 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : purchase.paymentMethod === '충전금액'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <option value="">선택</option>
                      <option value="카드">카드</option>
                      <option value="충전금액">충전금액</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={purchase.deliveryStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as '출고예정' | '출고' | '출고완료' | 'CN 미도착' | 'CN 도착' | '입고완료';
                      
                      // 출고예정 → 출고로 변경 시 운송장 번호 입력
                      if (newStatus === '출고' && purchase.deliveryStatus === '출고예정') {
                        const trackingNumber = prompt('CJ대한통운 운송장 번호를 입력하세요:');
                        if (trackingNumber && trackingNumber.trim()) {
                          onUpdate(purchase.id, { 
                            deliveryStatus: newStatus,
                            trackingNumber: trackingNumber.trim()
                          });
                        } else {
                          alert('운송장 번호를 입력해야 합니다.');
                        }
                      } else {
                        onUpdate(purchase.id, { deliveryStatus: newStatus });
                      }
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(purchase.deliveryStatus)}`}
                  >
                    <option value="출고예정">출고예정</option>
                    <option value="출고">출고</option>
                    <option value="출고완료">출고완료</option>
                    <option value="CN 미도착">CN 미도착</option>
                    <option value="CN 도착">CN 도착</option>
                    <option value="입고완료">입고완료</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {purchase.trackingNumber ? (
                    <a
                      href={`https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${purchase.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-sm"
                      title="CJ대한통운 배송조회"
                    >
                      📦 {purchase.trackingNumber}
                    </a>
                  ) : purchase.deliveryStatus !== '출고예정' ? (
                    <button
                      onClick={() => {
                        const trackingNumber = prompt('CJ대한통운 운송장 번호를 입력하세요:');
                        if (trackingNumber && trackingNumber.trim()) {
                          onUpdate(purchase.id, { trackingNumber: trackingNumber.trim() });
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-blue-600 underline"
                    >
                      + 번호 입력
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(purchase)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium text-sm flex items-center gap-1 whitespace-nowrap"
                      title="수정"
                    >
                      ✏️ 수정
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`정말 삭제하시겠습니까?\n\n신청번호: #${purchase.applicationNumber}\n제품: ${purchase.productName}`)) {
                          onDelete(purchase.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium text-sm flex items-center gap-1 whitespace-nowrap"
                      title="삭제"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </td>
              </tr>
              {purchase.note && (
                <tr className="bg-gray-50">
                  <td colSpan={13} className="px-4 py-2 text-sm text-gray-600">
                    {purchase.note}
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
