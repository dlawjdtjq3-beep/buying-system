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

export function calculateTax(yuanPrice: number): TaxCalculation {
  // 1) 과세가격 계산
  const assessmentPrice = Math.round(yuanPrice * EXCHANGE_RATE);

  // 2) 관세 (전 구간 8% 공통)
  const tariff = Math.round(assessmentPrice * 0.08);

  // 3) 개별소비세 과세표준 (2,000,000원 초과분)
  const consumerTaxBase = Math.max(0, assessmentPrice - 2_000_000);

  // 4) 개별소비세 (과세표준의 20%)
  const consumerTax = Math.round(consumerTaxBase * 0.2);

  // 5) 교육세 (개별소비세의 30%)
  const educationTax = Math.round(consumerTax * 0.3);

  // 6) 부가세 (전 구간 10% 공통)
  const taxableForVAT = assessmentPrice + tariff + consumerTax + educationTax;
  const vat = Math.round(taxableForVAT * 0.1);

  // 7) 총 세금
  const totalTax = tariff + consumerTax + educationTax + vat;

  // 8) 실제 부담액
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
