'use client';

import { useState, useMemo } from 'react';
import PurchaseForm from '@/components/PurchaseForm';
import PurchaseTable from '@/components/PurchaseTable';
import PurchaseStats from '@/components/PurchaseStats';
import { usePurchases } from '@/hooks/usePurchases';
import { Purchase, PurchaseFormData, ProductCategory } from '@/types/purchase';

export default function Home() {
  const { purchases, isLoading, error, addPurchase, updatePurchase, deletePurchase } = usePurchases();
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedPurchaseStatus, setSelectedPurchaseStatus] = useState<'구매완료' | '미구매' | null>(null);
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<'출고예정' | '출고' | '출고완료' | null>(null);

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

  const handleSubmit = (data: PurchaseFormData) => {
    if (editingPurchase) {
      updatePurchase(editingPurchase.id, data);
      setEditingPurchase(null);
    } else {
      addPurchase(data);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcelDownload = async () => {
    // Excel 라이브러리를 필요할 때만 동적으로 로딩 (초기 로딩 속도 개선)
    const XLSX = await import('xlsx');
    
    const exportData = filteredPurchases.map((p, index) => ({
      '번호': index + 1,
      '신청번호': `#${p.applicationNumber}`,
      '신청일': p.applicationDate,
      '신청인': p.applicant,
      '카테고리': p.category,
      '제품명': p.productName,
      '금액(위안)': p.amount,
      '금액(한화)': Math.round(p.amount * 195),
      '구매여부': p.purchaseStatus,
      '배송단계': p.deliveryStatus,
      'URL': p.productUrl,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '구매목록');
    
    // 열 너비 설정
    ws['!cols'] = [
      { wch: 6 },  // 번호
      { wch: 10 }, // 신청번호
      { wch: 12 }, // 신청일
      { wch: 10 }, // 신청인
      { wch: 10 }, // 카테고리
      { wch: 30 }, // 제품명
      { wch: 12 }, // 금액(위안)
      { wch: 12 }, // 금액(한화)
      { wch: 10 }, // 구매여부
      { wch: 10 }, // 배송단계
      { wch: 50 }, // URL
    ];

    XLSX.writeFile(wb, `구매목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">구매 관리 시스템</h1>
          <p className="text-gray-600">한국/중국 공동 구매 관리 플랫폼</p>
          <p className="text-sm text-gray-500 mt-1">💡 여러 명이 함께 사용 가능</p>
        </header>

        {/* Firebase 설정 안내 */}
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
                  실시간 동기화를 사용하려면 <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Firebase를 설정</a>하세요. 
                  자세한 내용은 <span className="font-mono">FIREBASE_SETUP.md</span> 파일을 참고하세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 폼 토글 버튼 */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (editingPurchase) setEditingPurchase(null);
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
              showForm
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showForm ? '📋 목록만 보기' : '✏️ 등록 폼 보기'}
          </button>
        </div>

        {/* 등록/수정 폼 */}
        {showForm && (
          <PurchaseForm
            onSubmit={handleSubmit}
            initialData={editingPurchase || undefined}
            onCancel={editingPurchase ? () => setEditingPurchase(null) : undefined}
          />
        )}

        <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
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
          <div className="flex gap-2">
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

        {/* 통계 정보 */}
        <PurchaseStats 
          purchases={purchases} 
          onCategoryFilter={setSelectedCategory}
          selectedCategory={selectedCategory}
          onPurchaseStatusFilter={setSelectedPurchaseStatus}
          selectedPurchaseStatus={selectedPurchaseStatus}
          onDeliveryStatusFilter={setSelectedDeliveryStatus}
          selectedDeliveryStatus={selectedDeliveryStatus}
        />

        {/* 구매 목록 테이블 */}
        <PurchaseTable
          purchases={filteredPurchases}
          onEdit={handleEdit}
          onDelete={deletePurchase}
          onUpdate={updatePurchase}
        />
      </div>
    </div>
  );
}
