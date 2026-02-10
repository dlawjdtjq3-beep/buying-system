export type ProductCategory = '가방' | '악세사리' | '의류' | '신발' | '시계' | '기타';

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
  purchaseStatus: '구매완료' | '미구매'; // 구매여부
  deliveryStatus: '출고예정' | '출고' | '출고완료'; // 배송 단계
}

export type PurchaseFormData = Omit<Purchase, 'id' | 'applicationNumber'>;
