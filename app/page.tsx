'use client';

import { useState, useMemo, useEffect } from 'react';
import PurchaseForm from '@/components/PurchaseForm';
import PurchaseTable from '@/components/PurchaseTable';
import PurchaseStats from '@/components/PurchaseStats';
import ChargeHistoryTable from '@/components/ChargeHistoryTable';
import Pagination from '@/components/Pagination';
import PageSizeSelector from '@/components/PageSizeSelector';
import Sidebar, { MobileTabs, ViewKey } from '@/components/Sidebar';
import FilterBar from '@/components/FilterBar';
import MonthlyStats from '@/components/MonthlyStats';
import { usePurchases } from '@/hooks/usePurchases';
import { useChargeBalance } from '@/hooks/useChargeBalance';
import { Purchase, PurchaseFormData, ProductCategory } from '@/types/purchase';

export default function Home() {
  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';
  const isElla = systemName === 'ella';
  const { purchases, isLoading, error, addPurchase, updatePurchase, deletePurchase, fetchPurchaseForEdit, fetchImagesByIds } = usePurchases();
  const { balance, totalDeducted, chargeHistory, isLoading: isChargeLoading, addCharge, deductBalance } = useChargeBalance();
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [view, setView] = useState<ViewKey>('list');
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedPurchaseStatus, setSelectedPurchaseStatus] = useState<'구매완료' | '구매원함' | '미구매' | '품절' | '사진 등록' | null>(null);
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<'출고예정' | '출고' | '출고완료' | 'CN 미도착' | 'CN 도착' | '입고완료' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  // 카테고리, 구매여부, 배송단계 필터링
  const filteredPurchases = useMemo(() => {
    let result = purchases;
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (selectedPurchaseStatus) {
      result = result.filter(p => p.purchaseStatus === selectedPurchaseStatus);
    }
    if (selectedDeliveryStatus) {
      result = result.filter(p => p.deliveryStatus === selectedDeliveryStatus);
    }
    return result;
  }, [purchases, selectedCategory, selectedPurchaseStatus, selectedDeliveryStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedPurchaseStatus, selectedDeliveryStatus, pageSize]);

  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  useEffect(() => {
    const idsToFetch = paginatedPurchases
      .filter(p => !imageMap[p.id])
      .map(p => p.id);

    if (idsToFetch.length === 0) {
      return;
    }

    const loadImages = async () => {
      const result = await fetchImagesByIds(idsToFetch);
      if (Object.keys(result).length > 0) {
        setImageMap(prev => ({ ...prev, ...result }));
      }
    };

    loadImages();
  }, [paginatedPurchases, imageMap, fetchImagesByIds]);

  const paginatedPurchasesWithImages = useMemo(() => {
    return paginatedPurchases.map(purchase => ({
      ...purchase,
      // imageUrl이 있으면 사용, 없으면 imageMap에서 가져온 base64 사용
      imageUrl: purchase.imageUrl || imageMap[purchase.id],
      imageData: imageMap[purchase.id] ?? purchase.imageData,
    }));
  }, [paginatedPurchases, imageMap]);

  const isChargeDeductTarget = (status: Purchase['purchaseStatus'], method?: Purchase['paymentMethod']) => {
    return (status === '구매원함' || status === '구매완료') && method === '충전금액';
  };

  const handleSubmit = async (data: PurchaseFormData) => {
    const newTotalAmount = data.amount + (data.commission || 0) + (data.appraisalFee || 0) + (data.shippingFee || 0);

    if (editingPurchase) {
      const oldTotalAmount = editingPurchase.amount + (editingPurchase.commission || 0) + (editingPurchase.appraisalFee || 0) + (editingPurchase.shippingFee || 0);
      const wasTarget = isChargeDeductTarget(editingPurchase.purchaseStatus, editingPurchase.paymentMethod);
      const isTarget = isChargeDeductTarget(data.purchaseStatus, data.paymentMethod);

      // 차감 대상이 새로 되는 경우
      if (!wasTarget && isTarget) {
        const success = await deductBalance(newTotalAmount);
        if (!success) {
          alert(`충전 잔액이 부족합니다. (현재: ${balance.toFixed(2)}위안, 필요: ${newTotalAmount.toFixed(2)}위안)`);
          return;
        }
      }

      // 차감 대상에서 벗어나는 경우 환불 검증만 수행
      if (wasTarget && !isTarget) {
        await deductBalance(-oldTotalAmount); // 음수 차감 = 잔액 복원
      }

      // 차감 대상 유지 + 금액 변경 시 차액 정산
      if (wasTarget && isTarget) {
        const amountDiff = newTotalAmount - oldTotalAmount;
        if (amountDiff > 0) {
          const success = await deductBalance(amountDiff);
          if (!success) {
            alert(`충전 잔액이 부족합니다. (현재: ${balance.toFixed(2)}위안, 필요: ${amountDiff.toFixed(2)}위안)`);
            return;
          }
        } else if (amountDiff < 0) {
          await deductBalance(amountDiff); // 음수 차감 = 잔액 복원
        }
      }
    } else {
      // 신규 등록 시 차감 대상이면 즉시 차감
      if (isChargeDeductTarget(data.purchaseStatus, data.paymentMethod)) {
        const success = await deductBalance(newTotalAmount);
        if (!success) {
          alert(`충전 잔액이 부족합니다. (현재: ${balance.toFixed(2)}위안, 필요: ${newTotalAmount.toFixed(2)}위안)`);
          return;
        }
      }
    }
    
    if (editingPurchase) {
      updatePurchase(editingPurchase.id, data);
      setEditingPurchase(null);
    } else {
      addPurchase(data);
    }
  };

  const handleEdit = async (purchase: Purchase) => {
    // 이미지를 포함한 전체 데이터 조회
    const fullPurchase = await fetchPurchaseForEdit(purchase.id);
    if (fullPurchase) {
      setEditingPurchase(fullPurchase);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTableUpdate = async (id: string, data: Partial<PurchaseFormData>) => {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    // 상태/결제방법 변경으로 충전금액 차감 조건이 바뀌는 경우 처리
    const oldStatus = purchase.purchaseStatus;
    const oldMethod = purchase.paymentMethod;
    const newStatus = data.purchaseStatus ?? oldStatus;
    const newMethod = data.paymentMethod ?? oldMethod;
    const oldTotalAmount = purchase.amount + (purchase.commission || 0) + (purchase.appraisalFee || 0) + (purchase.shippingFee || 0);

    const wasChargeDeductTarget = isChargeDeductTarget(oldStatus, oldMethod);
    const willChargeDeductTarget = isChargeDeductTarget(newStatus, newMethod);

    // 차감 대상이 새로 되는 경우
    if (!wasChargeDeductTarget && willChargeDeductTarget) {
      const success = await deductBalance(oldTotalAmount);
      if (!success) {
        alert(`충전 잔액이 부족합니다. (현재: ${balance.toFixed(2)}위안, 필요: ${oldTotalAmount.toFixed(2)}위안)`);
        return;
      }
    }

    // 차감 대상에서 벗어나는 경우 환불 검증만 수행
    if (wasChargeDeductTarget && !willChargeDeductTarget) {
      await deductBalance(-oldTotalAmount); // 음수 차감 = 잔액 복원
    }

    updatePurchase(id, data);
  };

  const handleExcelDownload = async () => {
    // Excel 라이브러리를 필요할 때만 동적으로 로딩 (초기 로딩 속도 개선)
    const XLSX = await import('xlsx');
    const { calculateTax } = await import('@/lib/utils');
    
    // 구매 목록 시트
    const exportData = filteredPurchases.map((p, index) => {
      const totalYuan = p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0);
      const taxCalc = calculateTax(totalYuan);
      return {
        '번호': index + 1,
        '신청번호': `#${p.applicationNumber}`,
        '신청일': p.applicationDate,
        '신청인': p.applicant,
        '카테고리': p.category,
        '제품명': p.productName,
        '상품금액(위안)': p.amount,
        '수수료': p.commission || 0,
        '감정비': p.appraisalFee || 0,
        '배송비': p.shippingFee || 0,
        '총금액(위안)': totalYuan,
        '실제부담액(한화)': Math.round(taxCalc.totalPayment),
        '구매여부': p.purchaseStatus,
        '결제방법': p.paymentMethod || '-',
        '배송단계': p.deliveryStatus,
        '운송장번호': p.trackingNumber || '-',
        'URL': p.productUrl,
      };
    });

    const ws1 = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, '구매목록');
    
    // 열 너비 설정
    ws1['!cols'] = [
      { wch: 6 },  // 번호
      { wch: 10 }, // 신청번호
      { wch: 12 }, // 신청일
      { wch: 10 }, // 신청인
      { wch: 10 }, // 카테고리
      { wch: 30 }, // 제품명
      { wch: 14 }, // 상품금액(위안)
      { wch: 10 }, // 수수료
      { wch: 10 }, // 감정비
      { wch: 10 }, // 배송비
      { wch: 14 }, // 총금액(위안)
      { wch: 16 }, // 실제부담액(한화)
      { wch: 10 }, // 구매여부
      { wch: 12 }, // 결제방법
      { wch: 10 }, // 배송단계
      { wch: 15 }, // 운송장번호
      { wch: 50 }, // URL
    ];

    // 충전 내역 시트
    const chargeData = chargeHistory.map((h, index) => ({
      '번호': index + 1,
      '일자': h.date,
      '금액(위안)': h.amount,
      '금액(한화)': Math.round(h.amount * 225),
      '거래후잔액': h.balance,
      '구분': h.amount > 0 ? '충전' : '차감',
    }));

    const ws2 = XLSX.utils.json_to_sheet(chargeData);
    XLSX.utils.book_append_sheet(wb, ws2, '충전내역');
    
    ws2['!cols'] = [
      { wch: 6 },  // 번호
      { wch: 12 }, // 일자
      { wch: 12 }, // 금액(위안)
      { wch: 12 }, // 금액(한화)
      { wch: 12 }, // 거래후잔액
      { wch: 10 }, // 구분
    ];

    XLSX.writeFile(wb, `구매목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        view={view}
        onChange={setView}
        systemLabel={`${systemName === 'vmce' ? 'VMCE' : '엘라'} 구매관리`}
        counts={{ total: purchases.length }}
      />

      <div className="flex-1 min-w-0">
        {/* 상단바 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 sticky top-0 z-30">
          <h1 className="text-[15px] font-semibold text-gray-900">
            {view === 'list' && '구매 관리'}
            {view === 'charge' && '충전 관리'}
            {view === 'monthly' && '월별 통계'}
          </h1>
          <div className="flex items-center gap-2">
            {view === 'charge' && (
              <button
                onClick={() => setShowChargeModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors"
              >
                충전하기
              </button>
            )}
            {view === 'list' && (
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (editingPurchase) setEditingPurchase(null);
                }}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  showForm
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {showForm ? '목록만 보기' : '새 항목 등록'}
              </button>
            )}
          </div>
        </header>

        <MobileTabs view={view} onChange={setView} />

        <main className="p-5 max-w-[1600px]">
        {/* 데이터 로드 오류 안내 */}
        {error && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  ⚠️ {error}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Supabase 테이블/권한(RLS) 또는 네트워크 상태를 확인하세요. 
                  환경 설정은 <span className="font-mono">supabase_setup.sql</span>을 참고하세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 등록/수정 폼 */}
        {view === 'list' && showForm && (
          <PurchaseForm
            onSubmit={handleSubmit}
            initialData={editingPurchase || undefined}
            onCancel={editingPurchase ? () => setEditingPurchase(null) : undefined}
            isElla={isElla}
          />
        )}

        {view === 'list' && (
        <>
        {/* 통계 정보 (기존) */}
        <PurchaseStats
          purchases={purchases}
          onCategoryFilter={setSelectedCategory}
          selectedCategory={selectedCategory}
          onPurchaseStatusFilter={setSelectedPurchaseStatus}
          selectedPurchaseStatus={selectedPurchaseStatus}
          onDeliveryStatusFilter={setSelectedDeliveryStatus}
          selectedDeliveryStatus={selectedDeliveryStatus}
          isElla={isElla}
        />

        {/* 클릭 필터 */}
        <FilterBar
          purchases={purchases}
          selectedCategory={selectedCategory}
          onCategory={setSelectedCategory}
          selectedPurchaseStatus={selectedPurchaseStatus}
          onPurchaseStatus={setSelectedPurchaseStatus}
          selectedDeliveryStatus={selectedDeliveryStatus}
          onDeliveryStatus={setSelectedDeliveryStatus}
        />

        <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">
              구매 목록 ({filteredPurchases.length}건)
            </h2>
            {(selectedCategory || selectedPurchaseStatus || selectedDeliveryStatus) && (
              <div className="text-sm text-gray-600 mt-1">
                필터: 
                {selectedCategory && <span className="ml-1 text-purple-600 font-medium">{selectedCategory}</span>}
                {selectedPurchaseStatus && <span className="ml-1 text-green-600 font-medium">{selectedPurchaseStatus}</span>}
                {selectedDeliveryStatus && <span className="ml-1 text-blue-600 font-medium">{selectedDeliveryStatus}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingPurchase(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                ➕ 새 항목 등록
              </button>
            )}
            {purchases.length > 0 && (
              <>
                <button
                  onClick={handleExcelDownload}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  📊 엑셀 다운로드
                </button>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(purchases, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                    const exportFileDefaultName = `purchases_${new Date().toISOString().split('T')[0]}.json`;
                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  💾 JSON 다운로드
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
        </div>
        <PurchaseTable
          purchases={paginatedPurchasesWithImages}
          onEdit={handleEdit}
          onDelete={deletePurchase}
          onUpdate={handleTableUpdate}
          isElla={isElla}
        />

        <Pagination
          currentPage={currentPage}
          totalCount={filteredPurchases.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
        </>
        )}

        {/* 충전 관리 */}
        {view === 'charge' && (
          <ChargeHistoryTable chargeHistory={chargeHistory} currentBalance={balance} totalDeducted={totalDeducted} />
        )}

        {/* 월별 통계 */}
        {view === 'monthly' && <MonthlyStats purchases={purchases} />}
        </main>
      </div>

      {/* 충전 모달 */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                충전금액 추가
              </h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                충전 금액 (위안)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 font-semibold">¥</span>
                <input
                  type="number"
                  step="0.01"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold transition-all"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {chargeAmount && (
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
                  </svg>
                  한화: 약 ₩{Math.round(parseFloat(chargeAmount) * 195).toLocaleString('ko-KR')}
                </div>
              )}
            </div>

            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">현재 잔액</span>
                <span className="text-xl font-bold text-blue-600">¥{balance.toFixed(2)}</span>
              </div>
              {chargeAmount && (
                <>
                  <div className="border-t border-blue-200 my-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">충전 후 잔액</span>
                      <span className="text-2xl font-bold text-green-600">
                        ¥{(balance + parseFloat(chargeAmount || '0')).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChargeModal(false);
                  setChargeAmount('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(chargeAmount);
                  if (!amount || amount <= 0) {
                    alert('올바른 금액을 입력하세요.');
                    return;
                  }
                  await addCharge(amount);
                  setShowChargeModal(false);
                  setChargeAmount('');
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                충전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
