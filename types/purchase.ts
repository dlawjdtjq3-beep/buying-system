export type ProductCategory = '가방' | '악세사리' | '의류' | '신발' | '시계' | '기타';
export type PaymentMethod = '카드' | '충전금액';

export interface Purchase {
  id: string;
  applicationDate: string; // 신청일
  applicationNumber: number; // 신청번호 (자동)
  applicant: string; // 신청인
  category: ProductCategory; // 제품 카테고리
  imageData: string; // 사진 (base64)
  productUrl: string; // URL (구매한 URL)
  productName: string; // 대표 제품명
  amount: number; // 금액(위안)
  commission?: number; // 수수료 (구매완료 시)
  appraisalFee?: number; // 감정비 (구매완료 시)
  shippingFee?: number; // 배송비 (구매완료 시)
  purchaseStatus: '구매완료' | '미구매'; // 구매여부
  paymentMethod?: PaymentMethod; // 결제 방법 (구매완료 시에만)
  deliveryStatus: '출고예정' | '출고' | '출고완료'; // 배송 단계
  trackingNumber?: string; // 운송장 번호 (출고 시에만)
}

export interface ChargeHistory {
  id: string;
  date: string; // 충전 일자
  amount: number; // 충전 금액 (위안)
  balance: number; // 충전 후 잔액
  createdAt: number; // 타임스탬프
}

export type PurchaseFormData = Omit<Purchase, 'id' | 'applicationNumber'>;
