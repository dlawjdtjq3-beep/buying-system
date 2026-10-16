// 숫자를 천 단위 콤마로 포맷팅
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 위안을 한화로 환산 (환율: 225원/위안)
export const EXCHANGE_RATE = 225;

export function convertToKRW(yuan: number): number {
  return yuan * EXCHANGE_RATE;
}

export function formatYuan(yuan: number): string {
  return `¥${formatNumber(yuan)}`;
}

export function formatKRW(krw: number): string {
  return `₩${Math.round(krw).toLocaleString('ko-KR')}`;
}

/**
 * 해외직구 관세 계산 (중국 물품)
 * @param yuanPrice 상품 가격 (위안)
 * @returns 관세 계산 결과 객체
 */
export interface TaxCalculation {
  assessmentPrice: number;        // 과세가격 (원)
  tariff: number;                 // 관세
  consumerTaxBase: number;        // 개별소비세 과세표준
  consumerTax: number;            // 개별소비세
  educationTax: number;           // 교육세
  vat: number;                    // 부가세
  totalTax: number;               // 총 세금
  totalPayment: number;           // 실제 부담액 (과세가격 + 총세금)
}

/**
 * 품목별 세율
 * - 의류·신발: 관세 13%, 개별소비세 없음
 * - 가방·시계·악세사리: 관세 8%, (과세가격+관세) 200만원 초과분 개별소비세 20% + 교육세 30%
 * - 기타: 관세 8%, 개별소비세 없음
 * - 유지비용(소득세·배송비 등): 물건이 아니므로 관부가세 없음
 */
export const MAINTENANCE_CATEGORY = '유지비용';

function taxRuleOf(category?: string) {
  switch (category) {
    case '유지비용':
      return { tariffRate: 0, luxury: false, vat: false };
    case '의류':
    case '신발':
      return { tariffRate: 0.13, luxury: false, vat: true };
    case '기타':
      return { tariffRate: 0.08, luxury: false, vat: true };
    default: // 가방 · 시계 · 악세사리
      return { tariffRate: 0.08, luxury: true, vat: true };
  }
}

/**
 * @param yuanPrice 금액 (위안)
 * @param rate 적용 환율 (1위안 = ?원). 없으면 225
 * @param category 카테고리 (세율이 달라짐)
 */
export function calculateTax(yuanPrice: number, rate: number = EXCHANGE_RATE, category?: string): TaxCalculation {
  const rule = taxRuleOf(category);

  // 1) 과세가격 (원화로 바꾼 실제 물건값)
  const assessmentPrice = Math.round(yuanPrice * rate);

  // 2) 관세
  const tariff = Math.round(assessmentPrice * rule.tariffRate);

  // 3) 개별소비세 과세표준 = 과세가격 + 관세 - 200만원 (가방·시계류만)
  const consumerTaxBase = rule.luxury ? Math.max(0, assessmentPrice + tariff - 2_000_000) : 0;

  // 4) 개별소비세 20%
  const consumerTax = Math.round(consumerTaxBase * 0.2);

  // 5) 교육세 (개별소비세의 30%)
  const educationTax = Math.round(consumerTax * 0.3);

  // 6) 부가세 10% (과세가격 + 관세 + 개소세 + 교육세)
  const vat = rule.vat ? Math.round((assessmentPrice + tariff + consumerTax + educationTax) * 0.1) : 0;

  // 7) 관부가세 합계
  const totalTax = tariff + consumerTax + educationTax + vat;

  // 8) 총액 = 실제금액 + 관부가세
  const totalPayment = assessmentPrice + totalTax;

  return {
    assessmentPrice,
    tariff,
    consumerTaxBase,
    consumerTax,
    educationTax,
    vat,
    totalTax,
    totalPayment,
  };
}
