'use client';

import { Purchase, PurchaseFormData } from '@/types/purchase';
import { formatYuan, formatKRW, convertToKRW } from '@/lib/utils';

interface PurchaseTableProps {
  readonly purchases: Purchase[];
  readonly onEdit: (purchase: Purchase) => void;
  readonly onDelete: (id: string) => void;
  readonly onUpdate: (id: string, data: Partial<PurchaseFormData>) => void;
}

export default function PurchaseTable({ purchases, onEdit, onDelete, onUpdate }: PurchaseTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '구매완료':
        return 'bg-green-100 text-green-800';
      case '미구매':
        return 'bg-yellow-100 text-yellow-800';
      case '출고완료':
        return 'bg-blue-100 text-blue-800';
      case '출고':
        return 'bg-purple-100 text-purple-800';
      case '출고예정':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (purchases.length === 0) {
    return (
      <div className="bg-white p-12 rounded-lg shadow-md text-center">
        <p className="text-gray-500 text-lg">등록된 구매 내역이 없습니다.</p>
        <p className="text-gray-400 mt-2">위 폼을 사용하여 새로운 구매를 등록하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청인</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사진</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제품명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구매여부</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배송단계</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">#{purchase.applicationNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{purchase.applicationDate}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{purchase.applicant}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {purchase.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {purchase.imageData ? (
                    <button
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          win.document.write(`<img src="${purchase.imageData}" style="max-width:100%;height:auto;"/>`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={purchase.imageData}
                          alt={purchase.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <a 
                    href={purchase.productUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {purchase.productName}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="font-semibold text-blue-600">{formatYuan(purchase.amount)}</div>
                  <div className="text-xs text-gray-500">{formatKRW(convertToKRW(purchase.amount))}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={purchase.purchaseStatus}
                    onChange={(e) => onUpdate(purchase.id, { purchaseStatus: e.target.value as '구매완료' | '미구매' })}
                    className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(purchase.purchaseStatus)}`}
                  >
                    <option value="미구매">미구매</option>
                    <option value="구매완료">구매완료</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={purchase.deliveryStatus}
                    onChange={(e) => onUpdate(purchase.id, { deliveryStatus: e.target.value as '출고예정' | '출고' | '출고완료' })}
                    className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(purchase.deliveryStatus)}`}
                  >
                    <option value="출고예정">출고예정</option>
                    <option value="출고">출고</option>
                    <option value="출고완료">출고완료</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(purchase)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium text-sm flex items-center gap-1"
                      title="수정"
                    >
                      ✏️ 수정
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`정말 삭제하시겠습니까?\n\n신청번호: #${purchase.applicationNumber}\n제품: ${purchase.productName}`)) {
                          onDelete(purchase.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium text-sm flex items-center gap-1"
                      title="삭제"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
