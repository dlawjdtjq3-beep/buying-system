export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
        <div className="text-xl font-semibold text-gray-700">구매 관리 시스템 로딩 중...</div>
        <div className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</div>
      </div>
    </div>
  );
}
