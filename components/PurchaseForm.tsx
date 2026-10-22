'use client';

import { useState, useEffect } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';
import { calculateTax } from '@/lib/utils';
import { useFx } from '@/components/FxContext';
import { GoofishPrefill } from '@/lib/goofish';
import { DELIVERY_STEPS, autoDelivery, hasTrackingStage } from '@/lib/delivery';

import { myName } from '@/lib/auth';

interface PurchaseFormProps {
  /** 저장 성공이면 true, 실패면 false (실패 시 입력값을 지우지 않음) */
  readonly onSubmit: (data: PurchaseFormData) => void | Promise<boolean | void>;
  readonly initialData?: Purchase;
  readonly onCancel?: () => void;
  readonly isElla?: boolean;
  /** 闲鱼 버튼으로 넘어온 값 */
  readonly prefill?: GoofishPrefill | null;
}

export default function PurchaseForm({ onSubmit, initialData, onCancel, isElla = false, prefill }: PurchaseFormProps) {
  const [formData, setFormData] = useState<PurchaseFormData>({
    applicationDate: initialData?.applicationDate || new Date().toISOString().split('T')[0],
    applicant: initialData?.applicant || myName(),
    category: initialData?.category || '가방',
    imageData: initialData?.imageData || '',
    imageUrl: initialData?.imageUrl || '',
    productUrl: initialData?.productUrl || '',
    productName: initialData?.productName || '',
    amount: initialData?.amount || 0,
    commission: initialData?.commission || 0,
    appraisalFee: initialData?.appraisalFee || 0,
    shippingFee: initialData?.shippingFee || 0,
    purchaseStatus: initialData?.purchaseStatus || '미구매',
    paymentMethod: initialData?.paymentMethod,
    deliveryStatus: initialData?.deliveryStatus || '구매대기',
    trackingNumber: initialData?.trackingNumber,
    note: initialData?.note || '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const fx = useFx();
  const [amountInput, setAmountInput] = useState(initialData?.amount ? initialData.amount.toString() : '');
  const [goofishTitle, setGoofishTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);


  // initialData가 변경될 때 폼 전체 업데이트
  useEffect(() => {
    if (initialData) {
      setFormData({
        applicationDate: initialData.applicationDate,
        applicant: initialData.applicant,
        category: initialData.category,
        imageData: initialData.imageData || '',
        imageUrl: initialData.imageUrl || '',
        productUrl: initialData.productUrl,
        productName: initialData.productName,
        amount: initialData.amount,
        commission: initialData.commission || 0,
        appraisalFee: initialData.appraisalFee || 0,
        shippingFee: initialData.shippingFee || 0,
        purchaseStatus: initialData.purchaseStatus,
        paymentMethod: initialData.paymentMethod,
        deliveryStatus: initialData.deliveryStatus,
        trackingNumber: initialData.trackingNumber,
        note: (initialData.note || '').replace(/[~]/g, ''), // ~ 기호 제거
      });
      setAmountInput(initialData.amount.toString());
    } else {
      // initialData가 없으다면 초기화
      setFormData({
        applicationDate: new Date().toISOString().split('T')[0],
        applicant: myName(),
        category: '가방',
        imageData: '',
        imageUrl: '',
        productUrl: '',
        productName: '',
        amount: 0,
        commission: 0,
        appraisalFee: 0,
        shippingFee: 0,
        purchaseStatus: '미구매',
        paymentMethod: undefined,
        deliveryStatus: '구매대기',
        trackingNumber: undefined,
        note: '',
      });
      setAmountInput('');
    }
  }, [initialData]);

  // 신청인 — 새 등록은 로그인한 사람 이름으로 자동 (2026-10-22~, 예전엔 마지막에 쓴 이름 기억)
  useEffect(() => {
    if (initialData) return;
    const me = myName();
    if (me) setFormData(prev => (prev.applicant ? prev : { ...prev, applicant: me }));
  }, [initialData]);

  // 闲鱼 버튼으로 넘어온 값 채우기 (사진은 받아서 우리 저장소로 올라가게 imageData 로)
  useEffect(() => {
    if (!prefill || initialData) return;
    setGoofishTitle(prefill.title);
    setFormData(prev => ({
      ...prev,
      productUrl: prefill.productUrl,
      productName: prefill.productName,
      amount: prefill.amount,
      category: prefill.category,
      note: prev.note || prefill.title,
    }));
    setAmountInput(prefill.amount ? prefill.amount.toFixed(2) : '');
    if (prefill.imageUrl) {
      fetch(prefill.imageUrl)
        .then(r => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then(blob => new Promise<string>((resolve, reject) => {
          const rd = new FileReader();
          rd.onloadend = () => resolve(rd.result as string);
          rd.onerror = reject;
          rd.readAsDataURL(blob);
        }))
        .then(dataUrl => setFormData(prev => ({ ...prev, imageData: dataUrl, imageUrl: '' })))
        .catch(() => setFormData(prev => ({ ...prev, imageUrl: prefill.imageUrl })));
    }
  }, [prefill, initialData]);

  // 이미지 파일 처리 함수
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    
    // 올릴 때 자동으로 작게 줄이므로 원본은 20MB 까지 받음
    if (file.size > 20 * 1024 * 1024) {
      alert('이미지 크기는 20MB 이하여야 합니다.');
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    let ok: boolean | void;
    try {
      ok = await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
    if (ok === false) return; // 저장 실패 — 입력한 것 그대로 둠

    if (!initialData) {
      setGoofishTitle('');
      // 등록 완료 안내 + 같은 제품명·카테고리로 이어서 등록할지
      const keep = window.confirm(
        `✓ 등록되었습니다!\n\n같은 제품명(${formData.productName})·카테고리(${formData.category})로 이어서 등록할까요?\n\n확인 = 제품명·카테고리 남김 / 취소 = 새로 입력`,
      );
      // 새 항목 추가시 폼 초기화 (신청인은 그대로 남김 — 같은 사람이 연달아 등록)
      setFormData({
        applicationDate: new Date().toISOString().split('T')[0],
        applicant: formData.applicant,
        category: keep ? formData.category : '가방',
        imageData: '',
        imageUrl: '',
        productUrl: '',
        productName: keep ? formData.productName : '',
        amount: 0,
        commission: 0,
        appraisalFee: 0,
        shippingFee: 0,
        purchaseStatus: '미구매',
        deliveryStatus: '구매대기',
      });
      setAmountInput('');
    }
  };

  // ── 촘촘한 입력 화면용 공통 모양 ──
  const inp = 'w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';
  const star = <span className="text-red-500">*</span>;
  const totalYuan = (formData.amount || 0) + (formData.commission || 0) + (formData.appraisalFee || 0) + (formData.shippingFee || 0);
  // 신청일 직전 충전일의 환율
  const rate = fx.rateFor(formData.applicationDate);
  const rateChargeDate = fx.chargeDateFor(formData.applicationDate);
  const showTracking = hasTrackingStage(formData.deliveryStatus);

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-gray-200 mb-5">
      <h2 className="text-base font-semibold mb-3 text-gray-800">
        {initialData ? '구매 정보 수정' : '새 구매 등록'}
      </h2>
      {goofishTitle && !initialData && (
        <div className="mb-3 px-3 py-2 rounded-md bg-yellow-50 border border-yellow-200 text-[12px] text-yellow-900">
          🐟 闲鱼에서 가져왔어요 — 제품명·금액·카테고리·사진 확인 후 «등록하기»
          <div className="text-yellow-700/80 truncate mt-0.5">{goofishTitle}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-3">
        <div>
          <label className={lbl}>신청일 {star}</label>
          <input type="date" required value={formData.applicationDate}
            onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
            className={inp} />
        </div>

        <div>
          <label className={lbl}>신청인 {star}</label>
          <input type="text" required value={formData.applicant}
            onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
            className={inp} placeholder="신청인 이름" />
        </div>

        <div>
          <label className={lbl}>카테고리 {star}</label>
          <select required value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className={inp}>
            <option value="가방">가방</option>
            <option value="악세사리">악세사리</option>
            <option value="의류">의류</option>
            <option value="신발">신발</option>
            <option value="시계">시계</option>
            <option value="기타">기타</option>
            <option value="유지비용">유지비용 (세금·배송비 등)</option>
          </select>
        </div>

        <div>
          <label className={lbl}>금액(위안) {star}</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
            <input
              type="text"
              required
              value={amountInput}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                setAmountInput(value);
                const numValue = Number.parseFloat(value) || 0;
                setFormData({ ...formData, amount: numValue });
              }}
              onBlur={(e) => {
                const numValue = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                const formatted = numValue.toFixed(2);
                setAmountInput(formatted);
                setFormData({ ...formData, amount: Number.parseFloat(formatted) });
              }}
              onFocus={(e) => {
                if (e.target.value === '0.00') {
                  setAmountInput('');
                }
              }}
              className={`${inp} pl-6`}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className={lbl}>구매여부 {star}</label>
          <select
            required
            value={formData.purchaseStatus}
            onChange={(e) => {
              const newStatus = e.target.value as '미구매' | '구매원함' | '사진 등록' | '구매완료' | '품절';
              setFormData({
                ...formData,
                purchaseStatus: newStatus,
                paymentMethod: newStatus === '구매완료' ? formData.paymentMethod : undefined,
                deliveryStatus: autoDelivery(newStatus, formData.deliveryStatus),
              });
            }}
            className={inp}
          >
            <option value="미구매">미구매</option>
            <option value="구매원함">구매원함</option>
            {isElla && <option value="사진 등록">사진 등록</option>}
            <option value="구매완료">구매완료</option>
            <option value="품절">품절</option>
          </select>
        </div>

        <div>
          <label className={lbl}>배송 단계 {star}</label>
          <select
            required
            value={formData.deliveryStatus}
            onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value as PurchaseFormData['deliveryStatus'] })}
            className={inp}
          >
            {!DELIVERY_STEPS.includes(formData.deliveryStatus) && <option value={formData.deliveryStatus}>{formData.deliveryStatus}</option>}
            {DELIVERY_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-span-2 md:col-span-2 lg:col-span-3">
          <label className={lbl}>구매 URL {star}</label>
          <input type="text" required value={formData.productUrl}
            onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
            className={inp} placeholder="https://example.com/product" />
        </div>

        <div className="col-span-2 md:col-span-2 lg:col-span-3">
          <label className={lbl}>대표 제품명 {star}</label>
          <input type="text" required value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            className={inp} placeholder="Christian Dior Sweater" />
        </div>

        {formData.amount > 0 && (() => {
          const tax = calculateTax(formData.amount, rate, formData.category);
          const isUpkeep = formData.category === '유지비용';
          return (
            <div className="col-span-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-gray-700">
              <span className="font-semibold text-amber-900">{isUpkeep ? '🧾 유지비용' : '📦 관부가세'}</span>
              <span title={rateChargeDate ? `${rateChargeDate} 충전일 환율` : '충전 내역 없음'}>
                환율 {rate}{rateChargeDate && <span className="text-gray-400"> ({rateChargeDate} 충전)</span>}
              </span>
              <span>실제금액 ₩{tax.assessmentPrice.toLocaleString()}</span>
              {!isUpkeep && <span>관세 ₩{tax.tariff.toLocaleString()}</span>}
              {tax.consumerTax > 0 && (
                <>
                  <span className="text-amber-700">개소세 ₩{tax.consumerTax.toLocaleString()}</span>
                  <span>교육세(30%) ₩{tax.educationTax.toLocaleString()}</span>
                </>
              )}
              {!isUpkeep && <span>부가세 ₩{tax.vat.toLocaleString()}</span>}
              {!isUpkeep && <span className="font-semibold">관부가세 ₩{tax.totalTax.toLocaleString()}</span>}
              <span className="ml-auto font-bold text-amber-900 text-sm">총액 ₩{tax.totalPayment.toLocaleString()}</span>
            </div>
          );
        })()}

        {formData.purchaseStatus === '구매완료' && (
          <>
            {([
              ['수수료(위안)', 'commission'],
              ['감정비(위안)', 'appraisalFee'],
              ['배송비(위안)', 'shippingFee'],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData[key] || ''}
                    onChange={(e) => setFormData({ ...formData, [key]: Number.parseFloat(e.target.value) || 0 })}
                    className={`${inp} pl-6`}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className={lbl}>결제 방법 {star}</label>
              <select
                required
                value={formData.paymentMethod || ''}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as '카드' | '충전금액' })}
                className={inp}
              >
                <option value="">선택해주세요</option>
                <option value="카드">카드</option>
                <option value="충전금액">충전금액 차감</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className={lbl}>총 차감 금액</label>
              <div className="h-9 px-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-md"
                title={`제품 ¥${(formData.amount || 0).toFixed(2)} + 수수료 ¥${(formData.commission || 0).toFixed(2)} + 감정비 ¥${(formData.appraisalFee || 0).toFixed(2)} + 배송비 ¥${(formData.shippingFee || 0).toFixed(2)}`}>
                <span className="text-base font-bold text-indigo-700">¥{totalYuan.toFixed(2)}</span>
                <span className="text-xs text-gray-500">≈ ₩{Math.round(totalYuan * rate).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </>
        )}

        {showTracking && (
          <div className="col-span-2">
            <label className={lbl}>
              CJ대한통운 운송장번호
              {formData.trackingNumber && (
                <a
                  href={`https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${formData.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800 underline"
                >
                  📦 배송 조회
                </a>
              )}
            </label>
            <input
              type="text"
              value={formData.trackingNumber || ''}
              onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
              className={inp}
              placeholder="운송장 번호"
            />
          </div>
        )}

        <div className="col-span-2 md:col-span-2 lg:col-span-2">
          <label className={lbl}>사진 첨부</label>
          <div
            role="button"
            className={`h-[68px] flex items-center gap-3 px-3 border border-dashed rounded-md transition-colors cursor-pointer ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()}
            tabIndex={0}
          >
            {(formData.imageData || formData.imageUrl) ? (
              <>
                <img
                  src={formData.imageData || formData.imageUrl}
                  alt="미리보기"
                  className="w-12 h-12 object-cover rounded border border-gray-300 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageData: '', imageUrl: '' })}
                  className="px-2.5 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100"
                >
                  삭제
                </button>
              </>
            ) : (
              <svg className="h-7 w-7 text-gray-400 shrink-0" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <div className="text-xs text-gray-500 leading-tight">
              <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500">
                파일 선택
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
              <span> · 끌어놓기 / Ctrl+V</span>
              <div className="text-[11px] text-gray-400">자동으로 작게 줄여서 저장</div>
            </div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-2 lg:col-span-4">
          <label className={lbl}>비고 <span className="text-gray-400">(선택)</span></label>
          <textarea
            value={formData.note || ''}
            onChange={(e) => {
              const cleanValue = e.target.value.replace(/[~]/g, '');
              setFormData({ ...formData, note: cleanValue });
            }}
            className="w-full h-[68px] px-2.5 py-1.5 text-sm border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="주의 메모나 특이사항"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? '저장 중…' : initialData ? '수정 저장' : '등록하기'}
        </button>
      </div>
    </form>
  );
}
