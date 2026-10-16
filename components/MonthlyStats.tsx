'use client';

import { useMemo, useState } from 'react';
import { Purchase } from '@/types/purchase';
import { formatYuan, formatKRW, MAINTENANCE_CATEGORY } from '@/lib/utils';
import { useFx } from '@/components/FxContext';

interface MonthlyStatsProps {
  readonly purchases: Purchase[];
}

interface MonthRow {
  month: string;        // 2026-10
  total: number;        // 신청 건수 (유지비용 제외)
  done: number;         // 구매완료
  soldOut: number;      // 품절
  notBought: number;    // 미구매
  inProgress: number;   // 구매원함 + 사진 등록
  reqYuan: number;      // 구매요청금액 — 신청된 물건 전부 (위안)
  doneYuan: number;     // 구매완료금액 (위안)
  doneKrw: number;      // 구매완료 실제금액 (충전일 환율로 바꾼 원화)
  doneTax: number;      // 구매완료 관부가세 (개소세·교육세 포함)
  upkeepYuan: number;   // 유지비용 (위안)
  upkeepKrw: number;    // 유지비용 (원화)
  upkeepCount: number;
}

const EMPTY: Omit<MonthRow, 'month'> = {
  total: 0, done: 0, soldOut: 0, notBought: 0, inProgress: 0,
  reqYuan: 0, doneYuan: 0, doneKrw: 0, doneTax: 0,
  upkeepYuan: 0, upkeepKrw: 0, upkeepCount: 0,
};

const KEYS = Object.keys(EMPTY) as (keyof typeof EMPTY)[];

function avgRate(krw: number, yuan: number) {
  return yuan > 0 ? (krw / yuan).toFixed(2) : '-';
}

export default function MonthlyStats({ purchases }: MonthlyStatsProps) {
  const fx = useFx();
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo<MonthRow[]>(() => {
    const map = new Map<string, MonthRow>();

    for (const p of purchases) {
      // 신청일 기준으로 묶습니다 (DB에 «구매한 날» 칸이 없습니다)
      const month = (p.applicationDate || '').slice(0, 7);
      if (!month) continue;

      const row = map.get(month) ?? { month, ...EMPTY };
      const t = fx.taxFor(p);

      if (p.category === MAINTENANCE_CATEGORY) {
        // 유지비용 — 물건값이 아니므로 신청 건수·구매금액에서 빼고 따로 모읍니다 (품절 처리된 건 제외)
        if (p.purchaseStatus !== '품절') {
          row.upkeepCount += 1;
          row.upkeepYuan += t.yuan;
          row.upkeepKrw += t.assessmentPrice;
        }
        map.set(month, row);
        continue;
      }

      row.total += 1;
      row.reqYuan += t.yuan;

      switch (p.purchaseStatus) {
        case '구매완료':
          row.done += 1;
          row.doneYuan += t.yuan;
          row.doneKrw += t.assessmentPrice;
          row.doneTax += t.totalTax;
          break;
        case '품절':
          row.soldOut += 1;
          break;
        case '미구매':
          row.notBought += 1;
          break;
        default:
          row.inProgress += 1;
      }

      map.set(month, row);
    }

    const list = [...map.values()];
    list.sort((a, b) => (sortAsc ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month)));
    return list;
  }, [purchases, sortAsc, fx]);

  const sum = useMemo(() => {
    const acc = { ...EMPTY };
    for (const r of rows) for (const k of KEYS) acc[k] += r[k];
    return acc;
  }, [rows]);

  const maxYuan = Math.max(1, ...rows.map(r => r.doneYuan));

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500 text-sm">
        아직 집계할 내역이 없습니다.
      </div>
    );
  }

  const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));
  const spend = (r: Omit<MonthRow, 'month'>) => r.doneKrw + r.doneTax + r.upkeepKrw;

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: '전체 신청', value: `${sum.total.toLocaleString()}건`, sub: `구매완료 ${sum.done} · 성사율 ${pct(sum.done, sum.total)}%` },
          { label: '구매요청금액', value: formatYuan(sum.reqYuan), sub: '신청된 물건 전부' },
          { label: '구매완료금액', value: formatYuan(sum.doneYuan), sub: `실제 ${formatKRW(sum.doneKrw)} + 관부가세 ${formatKRW(sum.doneTax)}` },
          { label: '유지비용', value: formatYuan(sum.upkeepYuan), sub: `${formatKRW(sum.upkeepKrw)} · ${sum.upkeepCount}건` },
          { label: '총 지출(한화)', value: formatKRW(spend(sum)), sub: '구매완료 + 관부가세 + 유지비용' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-[12px] text-gray-500 mb-1">{c.label}</div>
            <div className="text-[18px] font-bold text-gray-900 leading-tight">{c.value}</div>
            <div className="text-[11px] text-gray-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 월별 표 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-gray-900">월별 집계</h3>
          <button
            type="button"
            onClick={() => setSortAsc(v => !v)}
            className="text-[12px] text-gray-500 hover:text-gray-800"
          >
            {sortAsc ? '오래된 순 ↑' : '최근 순 ↓'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[12px]">
                <th className="text-left font-semibold px-4 py-2.5">월</th>
                <th className="text-right font-semibold px-3 py-2.5">신청</th>
                <th className="text-right font-semibold px-3 py-2.5">구매완료</th>
                <th className="text-right font-semibold px-3 py-2.5">품절</th>
                <th className="text-right font-semibold px-3 py-2.5">미구매</th>
                <th className="text-right font-semibold px-3 py-2.5">진행중</th>
                <th className="text-right font-semibold px-3 py-2.5">성사율</th>
                <th className="text-right font-semibold px-3 py-2.5">구매요청금액(위안)</th>
                <th className="text-right font-semibold px-3 py-2.5">구매완료금액(위안)</th>
                <th className="text-right font-semibold px-3 py-2.5">유지비용(위안)</th>
                <th className="text-right font-semibold px-4 py-2.5">총 지출(한화)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.month} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-gray-900">{r.month.replace('-', '년 ')}월</div>
                    <div className="mt-1 h-1 bg-gray-100 rounded overflow-hidden w-28">
                      <div className="h-full bg-indigo-500" style={{ width: `${(r.doneYuan / maxYuan) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-900 font-medium">{r.total.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700 font-semibold">{r.done.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.soldOut.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.notBought.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.inProgress.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{pct(r.done, r.total)}%</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{formatYuan(r.reqYuan)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="text-gray-900 font-semibold">{formatYuan(r.doneYuan)}</div>
                    {r.doneYuan > 0 && (
                      <div className="text-[11px] text-gray-400 leading-snug mt-0.5">
                        환율 {avgRate(r.doneKrw, r.doneYuan)} · 실제 {formatKRW(r.doneKrw)}<br />
                        관부가세 {formatKRW(r.doneTax)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="text-gray-700">{r.upkeepYuan > 0 ? formatYuan(r.upkeepYuan) : '-'}</div>
                    {r.upkeepYuan > 0 && (
                      <div className="text-[11px] text-gray-400 mt-0.5">{formatKRW(r.upkeepKrw)} · {r.upkeepCount}건</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-semibold">{formatKRW(spend(r))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900 align-top">
                <td className="px-4 py-3">합계</td>
                <td className="px-3 py-3 text-right">{sum.total.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{sum.done.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.soldOut.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.notBought.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.inProgress.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{pct(sum.done, sum.total)}%</td>
                <td className="px-3 py-3 text-right">{formatYuan(sum.reqYuan)}</td>
                <td className="px-3 py-3 text-right">
                  <div>{formatYuan(sum.doneYuan)}</div>
                  <div className="text-[11px] text-gray-500 font-normal leading-snug mt-0.5">
                    환율 {avgRate(sum.doneKrw, sum.doneYuan)} · 실제 {formatKRW(sum.doneKrw)}<br />
                    관부가세 {formatKRW(sum.doneTax)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <div>{formatYuan(sum.upkeepYuan)}</div>
                  <div className="text-[11px] text-gray-500 font-normal mt-0.5">{formatKRW(sum.upkeepKrw)}</div>
                </td>
                <td className="px-4 py-3 text-right">{formatKRW(spend(sum))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
          신청일 기준으로 묶습니다. 구매요청금액 = 신청된 물건 전부, 구매완료금액 = 실제 산 물건만.
          환율은 각 건 신청일 직전에 충전한 날의 환율(월 평균으로 표시). 관부가세에는 개별소비세·교육세 포함.
          유지비용(세금·배송비 등)은 물건이 아니라 건수·구매금액에서 빼고 따로 모읍니다.
        </div>
      </div>
    </div>
  );
}
