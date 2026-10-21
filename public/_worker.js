// Cloudflare Pages 입구 — 옛 주소(*.pages.dev)는 막고, 새 주소(*.arsell.co.kr)만 화면을 보여줌
// (2026-10-21 대표님 지시: "그전 주소로 못 들어가게")
const BLOCKED = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>사용하지 않는 주소</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#334155}div{text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#64748b;margin:0}</style>
</head><body><div><h1>이 주소는 더 이상 사용하지 않습니다</h1><p>담당자에게 새 주소를 받아 주세요.</p></div></body></html>`;

export default {
  async fetch(request, env) {
    const host = new URL(request.url).hostname;
    if (host.endsWith('.pages.dev')) {
      return new Response(BLOCKED, {
        status: 403,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
