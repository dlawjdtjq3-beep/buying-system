'use client';

import React from 'react';

interface PageSizeSelectorProps {
  pageSize: number;
  setPageSize: (size: number) => void;
}

export default function PageSizeSelector({ pageSize, setPageSize }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
        항목 수:
      </label>
      <select
        id="pageSize"
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  );
}
