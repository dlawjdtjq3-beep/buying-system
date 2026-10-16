'use client';

/**
 * 충전한 날짜 기준 환율
 *
 * 규칙: 구매 건은 «신청일 직전(같은 날 포함)에 마지막으로 충전한 날»의 위안→원 환율을 씁니다.
 *       다음 충전이 들어오기 전까지 그 환율이 계속 적용됩니다.
 * 환율 출처: frankfurter (유럽중앙은행 기준환율, 매일 1회). 주말·휴일은 직전 영업일 환율.
 * 불러오기 실패 시 예전 고정값 225원을 씁니다 (화면에 «임시 환율» 표시).
 */

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Purchase, ChargeHistory } from '@/types/purchase';
import { calculateTax, EXCHANGE_RATE, TaxCalculation } from '@/lib/utils';

export type PurchaseTax = TaxCalculation & { rate: number; yuan: number; chargeDate?: string };

export interface FxValue {
  /** 그 날짜에 적용되는 환율 (마지막 충전일 기준) */
  rateFor: (date: string) => number;
  /** 특정 날짜 하루의 환율 (충전 내역 표시용) */
  rateOnDay: (date: string) => number;
  /** 그 날짜에 적용되는 충전일 */
  chargeDateFor: (date: string) => string | undefined;
  taxFor: (p: Purchase) => PurchaseTax;
  /** 환율을 못 불러와 225 고정값을 쓰는 중 */
  fallback: boolean;
}

export function totalYuanOf(p: Purchase) {
  return p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0);
}

const CACHE_KEY = 'fx-cny-krw-v1';

function shiftDate(d: string, days: number) {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

function buildFx(daily: Record<string, number>, charges: ChargeHistory[]): FxValue {
  const days = Object.keys(daily).sort();
  const fallback = days.length === 0;

  const rateOnDay = (date: string): number => {
    if (fallback || !date) return EXCHANGE_RATE;
    // date 이하 중 가장 가까운 영업일
    let lo = 0, hi = days.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (days[mid] <= date) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    const key = found >= 0 ? days[found] : days[0];
    return daily[key] ?? EXCHANGE_RATE;
  };

  const chargeDates = [...new Set(charges.filter(c => c.amount > 0 && c.date).map(c => c.date))].sort();

  const chargeDateFor = (date: string): string | undefined => {
    if (chargeDates.length === 0) return undefined;
    let pick: string | undefined;
    for (const c of chargeDates) {
      if (c <= date) pick = c; else break;
    }
    return pick ?? chargeDates[0]; // 첫 충전보다 이른 건은 첫 충전 환율
  };

  const rateFor = (date: string): number => {
    const c = chargeDateFor(date);
    return rateOnDay(c ?? date);
  };

  const taxFor = (p: Purchase): PurchaseTax => {
    const yuan = totalYuanOf(p);
    const chargeDate = chargeDateFor(p.applicationDate);
    const rate = rateOnDay(chargeDate ?? p.applicationDate);
    return { ...calculateTax(yuan, rate, p.category), rate, yuan, chargeDate };
  };

  return { rateFor, rateOnDay, chargeDateFor, taxFor, fallback };
}

/** page 에서 한 번 부르고, 아래 화면들은 useFx() 로 꺼내 씁니다 */
export function useFxRates(charges: ChargeHistory[]): FxValue {
  const [daily, setDaily] = useState<Record<string, number>>({});

  const earliest = useMemo(() => {
    const ds = charges.map(c => c.date).filter(Boolean).sort();
    return ds[0];
  }, [charges]);

  useEffect(() => {
    let cached: Record<string, number> = {};
    try {
      cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
    } catch { /* 저장소 못 씀 — 무시 */ }
    if (Object.keys(cached).length) setDaily(cached);

    const start = shiftDate(earliest || new Date().toISOString().slice(0, 10), -10);
    const end = new Date().toISOString().slice(0, 10);
    let alive = true;
    fetch(`https://api.frankfurter.dev/v1/${start}..${end}?from=CNY&to=KRW`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { rates?: Record<string, { KRW?: number }> }) => {
        const next: Record<string, number> = { ...cached };
        for (const [d, v] of Object.entries(j.rates || {})) if (v?.KRW) next[d] = v.KRW;
        if (!alive) return;
        setDaily(next);
        try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
      })
      .catch(err => console.warn('환율 불러오기 실패 — 225 고정값 사용', err));
    return () => { alive = false; };
  }, [earliest]);

  return useMemo(() => buildFx(daily, charges), [daily, charges]);
}

const FxCtx = createContext<FxValue | null>(null);
const DEFAULT_FX = buildFx({}, []);

export function FxProvider({ value, children }: { value: FxValue; children: ReactNode }) {
  return <FxCtx.Provider value={value}>{children}</FxCtx.Provider>;
}

export function useFx(): FxValue {
  return useContext(FxCtx) ?? DEFAULT_FX;
}
