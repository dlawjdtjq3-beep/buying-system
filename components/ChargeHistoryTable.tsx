'use client';

import { ChargeHistory } from '@/types/purchase';
import { formatYuan, formatKRW, convertToKRW } from '@/lib/utils';

interface ChargeHistoryTableProps {
  readonly chargeHistory: ChargeHistory[];
}

export default function ChargeHistoryTable({ chargeHistory }: ChargeHistoryTableProps) {
  if (chargeHistory.length === 0) {
    return (
      <div className="bg-white p-12 rounded-lg shadow-md text-center mb-6">
        <p className="text-gray-500 text-lg">충전 내역이 없습니다.</p>
        <p className="text-gray-400 mt-2">💰 충전하기 버튼을 사용하여 금액을 충전하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          💰 충전 내역
          <span className="text-sm font-normal opacity-90">({chargeHistory.length}건)</span>
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">일자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액(위안)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액(한화)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">거래 후 잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {chargeHistory.map((history, index) => {
              const isCharge = history.amount > 0;
              return (
                <tr key={history.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-600">
                    {chargeHistory.length - index}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{history.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      isCharge 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isCharge ? '💵 충전' : '💳 차감'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-bold ${isCharge ? 'text-green-600' : 'text-red-600'}`}>
                      {isCharge ? '+' : ''}{formatYuan(history.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className={isCharge ? 'text-green-600' : 'text-red-600'}>
                      {isCharge ? '+' : ''}{formatKRW(convertToKRW(history.amount))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-bold text-blue-600">{formatYuan(history.balance)}</div>
                    <div className="text-xs text-gray-500">{formatKRW(convertToKRW(history.balance))}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 통계 요약 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">총 충전</div>
            <div className="font-bold text-green-600">
              {formatYuan(chargeHistory.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0))}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">총 차감</div>
            <div className="font-bold text-red-600">
              {formatYuan(Math.abs(chargeHistory.filter(h => h.amount < 0).reduce((sum, h) => sum + h.amount, 0)))}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">현재 잔액</div>
            <div className="font-bold text-blue-600">
              {chargeHistory.length > 0 ? formatYuan(chargeHistory[0].balance) : formatYuan(0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
