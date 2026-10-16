'use client';

import { useMemo, useState } from 'react';
import { Purchase } from '@/types/purchase';
import { formatYuan, formatKRW, calculateTax } from '@/lib/utils';

interface MonthlyStatsProps {
  readonly purchases: Purchase[];
}

interface MonthRow {
  month: string;        // 2026-10
  total: number;        // 신청 건수
  done: number;         // 구매완료
  soldOut: number;      // 품절
  notBought: number;    // 미구매
  inProgress: number;   // 구매원함 + 사진 등록
  yuan: number;         // 구매완료 건의 총 위안
  krw: number;          // 구매완료 건의 실제부담액(세금 포함)
}

const EMPTY: Omit<MonthRow, 'month'> = {
  total: 0, done: 0, soldOut: 0, notBought: 0, inProgress: 0, yuan: 0, krw: 0,
};

/** 구매 한 건의 총액(위안) — 상품값 + 수수료 + 감정비 + 배송비 */
function totalYuanOf(p: Purchase) {
  return p.amount + (p.commission || 0) + (p.appraisalFee || 0) + (p.shippingFee || 0);
}

export default function MonthlyStats({ purchases }: MonthlyStatsProps) {
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo<MonthRow[]>(() => {
    const map = new Map<string, MonthRow>();

    for (const p of purchases) {
      // 신청일 기준으로 묶습니다 (DB에 «구매한 날» 칸이 없습니다)
      const month = (p.applicationDate || '').slice(0, 7);
      if (!month) continue;

      const row = map.get(month) ?? { month, ...EMPTY };
      row.total += 1;

      switch (p.purchaseStatus) {
        case '구매완료': {
          row.done += 1;
          const y = totalYuanOf(p);
          row.yuan += y;
          row.krw += calculateTax(y).totalPayment;
          break;
        }
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
  }, [purchases, sortAsc]);

  const sum = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          done: acc.done + r.done,
          soldOut: acc.soldOut + r.soldOut,
          notBought: acc.notBought + r.notBought,
          inProgress: acc.inProgress + r.inProgress,
          yuan: acc.yuan + r.yuan,
          krw: acc.krw + r.krw,
        }),
        { ...EMPTY },
      ),
    [rows],
  );

  const maxYuan = Math.max(1, ...rows.map(r => r.yuan));

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500 text-sm">
        아직 집계할 내역이 없습니다.
      </div>
    );
  }

  const rate = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '전체 신청', value: `${sum.total.toLocaleString()}건`, sub: `${rows.length}개월` },
          { label: '구매완료', value: `${sum.done.toLocaleString()}건`, sub: `성사율 ${rate(sum.done, sum.total)}%` },
          { label: '안 된 건', value: `${(sum.soldOut + sum.notBought).toLocaleString()}건`, sub: `품절 ${sum.soldOut} · 미구매 ${sum.notBought}` },
          { label: '총 구매금액', value: formatYuan(sum.yuan), sub: `실제부담 ${formatKRW(sum.krw)}` },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-[12px] text-gray-500 mb-1">{c.label}</div>
            <div className="text-[20px] font-bold text-gray-900 leading-tight">{c.value}</div>
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
                <th className="text-right font-semibold px-3 py-2.5">구매금액(위안)</th>
                <th className="text-right font-semibold px-4 py-2.5">실제부담액(한화)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.month} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-gray-900">{r.month.replace('-', '년 ')}월</div>
                    <div className="mt-1 h-1 bg-gray-100 rounded overflow-hidden w-28">
                      <div className="h-full bg-indigo-500" style={{ width: `${(r.yuan / maxYuan) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-900 font-medium">{r.total.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700 font-semibold">{r.done.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.soldOut.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.notBought.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{r.inProgress.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{rate(r.done, r.total)}%</td>
                  <td className="px-3 py-2.5 text-right text-gray-900 font-medium">{formatYuan(r.yuan)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-semibold">{formatKRW(r.krw)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                <td className="px-4 py-3">합계</td>
                <td className="px-3 py-3 text-right">{sum.total.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{sum.done.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.soldOut.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.notBought.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{sum.inProgress.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">{rate(sum.done, sum.total)}%</td>
                <td className="px-3 py-3 text-right">{formatYuan(sum.yuan)}</td>
                <td className="px-4 py-3 text-right">{formatKRW(sum.krw)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
          신청일 기준으로 묶습니다. 구매금액·실제부담액은 «구매완료» 건만 더합니다.
        </div>
      </div>
    </div>
  );
}
