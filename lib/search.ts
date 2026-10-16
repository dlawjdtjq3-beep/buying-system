import { Purchase } from '@/types/purchase';

/** 한글로 쳐도 영문 제품명이 걸리게 — 자주 쓰는 브랜드만 */
const BRAND_ALIASES: Record<string, string[]> = {
  샤넬: ['chanel'],
  루이비통: ['louis vuitton', 'lv', 'vuitton'],
  에르메스: ['hermes', 'hermès'],
  구찌: ['gucci'],
  프라다: ['prada'],
  미우미우: ['miu miu', 'miumiu'],
  디올: ['dior'],
  셀린느: ['celine', 'céline'],
  생로랑: ['saint laurent', 'ysl'],
  입생로랑: ['saint laurent', 'ysl'],
  보테가: ['bottega'],
  보테가베네타: ['bottega veneta', 'bottega'],
  펜디: ['fendi'],
  발렌시아가: ['balenciaga'],
  로에베: ['loewe'],
  고야드: ['goyard'],
  롤렉스: ['rolex'],
  까르띠에: ['cartier'],
  카르티에: ['cartier'],
  반클리프: ['van cleef', 'vca'],
  불가리: ['bvlgari', 'bulgari'],
  티파니: ['tiffany'],
  오메가: ['omega'],
  버버리: ['burberry'],
  몽클레어: ['moncler'],
  발렌티노: ['valentino'],
  지방시: ['givenchy'],
  톰브라운: ['thom browne'],
};

/**
 * 신청번호(#1586 / 1586) 또는 브랜드·제품명으로 찾기.
 * 숫자만 치면 신청번호가 그 숫자로 시작하는 건 + 제품명에 그 숫자가 들어간 건.
 */
export function matchSearch(p: Purchase, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;

  const num = q.replace(/^#/, '');
  if (/^\d+$/.test(num)) {
    return String(p.applicationNumber).startsWith(num) || (p.productName || '').includes(num);
  }

  const name = `${p.productName || ''} ${p.note || ''}`.toLowerCase();
  const compact = q.replace(/\s+/g, '');
  const words = [q, ...(BRAND_ALIASES[compact] || [])];
  return words.some(w => name.includes(w));
}
