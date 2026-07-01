'use client';

import React from 'react';

interface PageSizeSelectorProps {
  pageSize: number;
  setPageSize: (size: number) => void;
}

export default function PageSizeSelector({ pageSize, setPageSize }: PageSizeSelectorProps) {
  return (
    <select
      value={pageSize}
      onChange={(e) => setPageSize(Number(e.target.value))}
      className="px-2 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
    >
      <option value={30}>30</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>
  );
}
