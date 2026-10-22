'use client';

import { useEffect, useState } from 'react';
import { isNewStaff, listStaff, staffSeenAt } from '@/lib/auth';

/**
 * 관리자 화면 왼쪽 «직원 관리» 옆 NEW 숫자 — 마지막으로 직원 관리를 본 뒤 새로 등록한 직원 수
 * (직원 표는 실시간 신호를 못 받게 잠가 둬서 1분마다 한 번 확인 — 아주 가벼운 조회)
 */
export function useNewStaff(isAdmin: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    const check = async () => {
      try {
        const rows = await listStaff();
        const seen = staffSeenAt();
        if (alive) setCount(rows.filter(r => isNewStaff(r, seen)).length);
      } catch { /* 무시 */ }
    };
    check();
    const t = setInterval(check, 60000);
    const onSeen = () => setCount(0);
    window.addEventListener('buying-staff-seen', onSeen);
    return () => { alive = false; clearInterval(t); window.removeEventListener('buying-staff-seen', onSeen); };
  }, [isAdmin]);
  return count;
}
