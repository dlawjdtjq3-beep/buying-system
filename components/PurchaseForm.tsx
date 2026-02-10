'use client';

import { useState, useEffect } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';

interface PurchaseFormProps {
  readonly onSubmit: (data: PurchaseFormData) => void;
  readonly initialData?: Purchase;
  readonly onCancel?: () => void;
}

export default function PurchaseForm({ onSubmit, initialData, onCancel }: PurchaseFormProps) {
  const [formData, setFormData] = useState<PurchaseFormData>({
    applicationDate: initialData?.applicationDate || new Date().toISOString().split('T')[0],
    applicant: initialData?.applicant || '',
    category: initialData?.category || '가방',
    imageData: initialData?.imageData || '',
    productUrl: initialData?.productUrl || '',
    productName: initialData?.productName || '',
    amount: initialData?.amount || 0,
    purchaseStatus: initialData?.purchaseStatus || '미구매',
    paymentMethod: initialData?.paymentMethod,
    deliveryStatus: initialData?.deliveryStatus || '출고예정',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [amountInput, setAmountInput] = useState(initialData?.amount ? initialData.amount.toString() : '');

  // initialData가 변경될 때 폼 전체 업데이트
  useEffect(() => {
    if (initialData) {
      setFormData({
        applicationDate: initialData.applicationDate,
        applicant: initialData.applicant,
        category: initialData.category,
        imageData: initialData.imageData || '',
        productUrl: initialData.productUrl,
        productName: initialData.productName,
        amount: initialData.amount,
        purchaseStatus: initialData.purchaseStatus,
        paymentMethod: initialData.paymentMethod,
        deliveryStatus: initialData.deliveryStatus,
      });
      setAmountInput(initialData.amount.toString());
    } else {
      // initialData가 없으다면 초기화
      setFormData({
        applicationDate: new Date().toISOString().split('T')[0],
        applicant: '',
        category: '가방',
        imageData: '',
        productUrl: '',
        productName: '',
        amount: 0,
        purchaseStatus: '미구매',
        paymentMethod: undefined,
        deliveryStatus: '출고예정',
      });
      setAmountInput('');
    }
  }, [initialData]);

  // 이미지 파일 처리 함수
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, imageData: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageFile(file);
    }
  };

  // 붙여넣기 핸들러
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleImageFile(file);
          break;
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) {
      // 새 항목 추가시 폼 초기화
      setFormData({
        applicationDate: new Date().toISOString().split('T')[0],
        applicant: '',
        category: '가방',
        imageData: '',
        productUrl: '',
        productName: '',
        amount: 0,
        purchaseStatus: '미구매',
        deliveryStatus: '출고예정',
      });
      setAmountInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? '구매 정보 수정' : '새 구매 등록'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            신청일 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.applicationDate}
            onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            신청인 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.applicant}
            onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="신청인 이름"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="가방">가방</option>
            <option value="악세사리">악세사리</option>
            <option value="의류">의류</option>
            <option value="신발">신발</option>
            <option value="시계">시계</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사진 첨부
          </label>
          <div 
            role="button"
            className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()}
            tabIndex={0}
          >
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4 flex flex-col items-center text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2 inline-block">파일 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file);
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="mt-2">또는 이미지를 드래그하거나 붙여넣기 (Ctrl+V)</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (최대 5MB)</p>
              </div>
            </div>
            {formData.imageData && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="relative w-32 h-32 border border-gray-300 rounded-md overflow-hidden">
                  <img
                    src={formData.imageData}
                    alt="미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageData: '' })}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  이미지 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            구매 URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            required
            value={formData.productUrl}
            onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/product"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            대표 제품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Christian Dior Sweater"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            금액(위안) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
            <input
              type="text"
              required
              value={amountInput}
              onChange={(e) => {
                // 숫자와 소수점만 허용
                const value = e.target.value.replace(/[^0-9.]/g, '');
                setAmountInput(value);
                // 실시간으로 숫자 값 업데이트
                const numValue = Number.parseFloat(value) || 0;
                setFormData({ ...formData, amount: numValue });
              }}
              onBlur={(e) => {
                // 포커스 아웃 시 소수점 2자리로 포매팅
                const numValue = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                const formatted = numValue.toFixed(2);
                setAmountInput(formatted);
                setFormData({ ...formData, amount: Number.parseFloat(formatted) });
              }}
              onFocus={(e) => {
                // 포커스 시 0.00이면 빈 문자열로
                if (e.target.value === '0.00') {
                  setAmountInput('');
                }
              }}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          {formData.amount > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              한화: 약 ₩{Math.round(formData.amount * 195).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            구매여부 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.purchaseStatus}
            onChange={(e) => {
              const newStatus = e.target.value as '구매완료' | '미구매';
              setFormData({ 
                ...formData, 
                purchaseStatus: newStatus,
                // 미구매로 변경 시 결제 방법 초기화
                paymentMethod: newStatus === '미구매' ? undefined : formData.paymentMethod
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="미구매">미구매</option>
            <option value="구매완료">구매완료</option>
          </select>
        </div>

        {formData.purchaseStatus === '구매완료' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              결제 방법 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.paymentMethod || ''}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as '카드' | '충전금액' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택해주세요</option>
              <option value="카드">카드</option>
              <option value="충전금액">충전금액 차감</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            배송 단계 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.deliveryStatus}
            onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value as '출고예정' | '출고' | '출고완료' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="출고예정">출고예정</option>
            <option value="출고">출고</option>
            <option value="출고완료">출고완료</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          {initialData ? '수정하기' : '등록하기'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors font-medium"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
