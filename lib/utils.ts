// 숫자를 천 단위 콤마로 포맷팅
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 위안을 한화로 환산 (환율: 약 195원, 실시간으로 변경 가능)
export const EXCHANGE_RATE = 195;

export function convertToKRW(yuan: number): number {
  return yuan * EXCHANGE_RATE;
}

export function formatYuan(yuan: number): string {
  return `¥${formatNumber(yuan)}`;
}

export function formatKRW(krw: number): string {
  return `₩${Math.round(krw).toLocaleString('ko-KR')}`;
}
