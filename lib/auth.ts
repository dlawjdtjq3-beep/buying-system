/**
 * 로그인 (엘라·VMCE 같은 계정) — DB 표 staff / staff_sessions 는 브라우저에서 직접 못 읽고 함수(rpc)로만 씀
 * - 직원이 처음 들어올 때 본명 + 숫자 4자리 비밀번호를 스스로 정함 (staff_enter). 관리자는 직원 관리에서 비밀번호를 보고 바꿀 수 있음
 *   (그래서 비밀번호 pin 은 관리자에게 보여주려고 그대로 저장함 — 관리자 함수로만 보임)
 * - 로그인하면 열쇠(token)를 이 브라우저에 보관 → 로그아웃하거나 관리자가 비번 변경·정지하기 전까지 유지
 * - 역할: admin(관리자, 직원 관리 가능) / buyer(구매 담당: 새 구매 등록·구매원함 알림) / staff(일반: 사진 등록 알림)
 */
import { supabase } from '@/lib/supabase';

export type Role = 'admin' | 'buyer' | 'staff';
export interface Me { token: string; name: string; role: Role }
export interface StaffRow { id: string; name: string; pin: string | null; role: Role; active: boolean; created_at: string }

const KEY = 'buying-auth';

export const ROLE_LABEL: Record<Role, string> = {
  admin: '관리자',
  buyer: '구매 담당',
  staff: '일반',
};

export function savedMe(): Me | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    return v && v.token ? v : null;
  } catch { return null; }
}
function saveMe(m: Me | null) {
  try {
    if (m) window.localStorage.setItem(KEY, JSON.stringify(m));
    else window.localStorage.removeItem(KEY);
  } catch { /* 무시 */ }
}

/** 저장된 열쇠가 아직 유효한지 확인 (이름·역할 최신으로) */
export async function checkMe(): Promise<Me | null> {
  const m = savedMe();
  if (!m) return null;
  const { data, error } = await supabase.rpc('staff_me', { p_token: m.token });
  if (error) return m; // 인터넷 문제면 일단 그대로 (다음에 다시 확인)
  if (!data) { saveMe(null); return null; }
  const me: Me = { token: m.token, name: data.name, role: data.role };
  saveMe(me);
  return me;
}

/**
 * 들어가기 — 이름이 있으면 비밀번호 확인, 없으면 'new' (create=true 로 다시 부르면 본명+4자리로 새로 등록)
 */
export async function enter(name: string, pin: string, create = false): Promise<{ status: 'ok'; me: Me } | { status: 'new' | 'wrong' }> {
  const { data, error } = await supabase.rpc('staff_enter', { p_name: name, p_pin: pin, p_create: create });
  if (error) throw new Error(error.message);
  if (data?.status === 'ok') {
    const me: Me = { token: data.token, name: data.name, role: data.role };
    saveMe(me);
    return { status: 'ok', me };
  }
  return { status: data?.status === 'new' ? 'new' : 'wrong' };
}

export async function logout() {
  const m = savedMe();
  saveMe(null);
  if (m) await supabase.rpc('staff_logout', { p_token: m.token });
}

/** 알림 구분용 — 지금 로그인한 사람 역할 (lib/notify.ts) */
export function myRole(): Role | null {
  return savedMe()?.role ?? null;
}
export function myName(): string {
  return savedMe()?.name ?? '';
}

// ── 관리자 전용 ──
/** 직원 관리 «NEW» — 관리자가 마지막으로 직원 관리를 본 뒤에 새로 등록한 사람 */
const STAFF_SEEN = 'buying-staff-seen';
const LOGIN_LAUNCH = '2026-10-22T08:05:00Z'; // 로그인 배포 시각 — 한 번도 안 봤으면 이후 등록자는 전부 NEW
export function staffSeenAt(): string {
  try { return window.localStorage.getItem(STAFF_SEEN) || LOGIN_LAUNCH; } catch { return LOGIN_LAUNCH; }
}
export function markStaffSeen(rows: StaffRow[]) {
  const max = rows.reduce((m, r) => (isNewStaff(r, m) ? r.created_at : m), staffSeenAt());
  try { window.localStorage.setItem(STAFF_SEEN, max); } catch { /* 무시 */ }
  try { window.dispatchEvent(new Event('buying-staff-seen')); } catch { /* 무시 */ }
}
export function isNewStaff(r: StaffRow, seenAt: string) {
  return new Date(r.created_at).getTime() > new Date(seenAt).getTime();
}
export async function listStaff(): Promise<StaffRow[]> {
  const { data, error } = await supabase.rpc('staff_list', { p_token: savedMe()?.token });
  if (error) throw new Error(error.message);
  return (data || []) as StaffRow[];
}
export async function saveStaff(s: { id?: string | null; name: string; pw?: string; role: Role; active: boolean }) {
  const { error } = await supabase.rpc('staff_save', {
    p_token: savedMe()?.token, p_id: s.id || null, p_name: s.name, p_pw: s.pw || null, p_role: s.role, p_active: s.active,
  });
  if (error) throw new Error(error.message);
}
export async function deleteStaff(id: string) {
  const { error } = await supabase.rpc('staff_delete', { p_token: savedMe()?.token, p_id: id });
  if (error) throw new Error(error.message);
}
