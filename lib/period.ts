/**
 * 구매 목록 기간 필터 (신청일 기준)
 * - recent : 최근 1개월 (기본 화면)
 * - week / month / year : 주·월·년 단위로 ◀ ▶ 넘겨 보기
 * - older  : 1개월보다 오래된 것만
 * - all    : 전체
 */
export type PeriodUnit = 'recent' | 'week' | 'month' | 'year' | 'older' | 'all';

export interface Period {
  unit: PeriodUnit;
  /** 주·월·년에서 보고 있는 기준 날짜 (YYYY-MM-DD) */
  anchor: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const todayStr = () => ymd(new Date());

/** 오늘 기준 1개월 전 날짜 (이 날짜부터가 «최근 1개월») */
export function oneMonthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return ymd(d);
}

/** [시작, 끝] (끝 포함). 범위가 없으면 null */
export function rangeOf(p: Period): [string, string] | null {
  const a = parse(p.anchor);
  switch (p.unit) {
    case 'recent':
      return [oneMonthAgo(), '9999-12-31'];
    case 'older':
      return ['0000-01-01', ymd(new Date(parse(oneMonthAgo()).getTime() - 86400000))];
    case 'week': {
      const day = (a.getDay() + 6) % 7; // 월요일 = 0
      const s = new Date(a); s.setDate(a.getDate() - day);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return [ymd(s), ymd(e)];
    }
    case 'month':
      return [ymd(new Date(a.getFullYear(), a.getMonth(), 1)), ymd(new Date(a.getFullYear(), a.getMonth() + 1, 0))];
    case 'year':
      return [`${a.getFullYear()}-01-01`, `${a.getFullYear()}-12-31`];
    default:
      return null;
  }
}

export function inPeriod(date: string, p: Period): boolean {
  const r = rangeOf(p);
  if (!r) return true;
  return !!date && date >= r[0] && date <= r[1];
}

/** ◀ ▶ 한 칸 이동 */
export function shiftPeriod(p: Period, dir: -1 | 1): Period {
  const a = parse(p.anchor);
  if (p.unit === 'week') a.setDate(a.getDate() + 7 * dir);
  else if (p.unit === 'month') a.setMonth(a.getMonth() + dir, 1);
  else if (p.unit === 'year') a.setFullYear(a.getFullYear() + dir);
  return { ...p, anchor: ymd(a) };
}

export function periodLabel(p: Period): string {
  const r = rangeOf(p);
  const a = parse(p.anchor);
  switch (p.unit) {
    case 'week':
      return r ? `${r[0].slice(5).replace('-', '/')} ~ ${r[1].slice(5).replace('-', '/')}` : '';
    case 'month':
      return `${a.getFullYear()}년 ${a.getMonth() + 1}월`;
    case 'year':
      return `${a.getFullYear()}년`;
    default:
      return '';
  }
}
