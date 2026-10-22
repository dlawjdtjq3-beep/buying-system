'use client';

import { useEffect, useState } from 'react';
import { ROLE_LABEL, Role, StaffRow, deleteStaff, isNewStaff, listStaff, markStaffSeen, saveStaff, staffSeenAt } from '@/lib/auth';
import { useAuth } from '@/components/AuthGate';

/** 직원 관리 (관리자만) — 엘라·VMCE 같은 계정. 이름·비밀번호·역할·사용 여부 */
type Edit = { id?: string; name: string; pw: string; role: Role; active: boolean };
const EMPTY: Edit = { name: '', pw: '', role: 'staff', active: true };

export default function StaffManager() {
  const { me } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [seenAt] = useState(() => staffSeenAt()); // 들어오기 전 기준 → 그 뒤 등록자에 NEW 표시
  async function load() {
    try {
      const r = await listStaff();
      setRows(r); setErr('');
      markStaffSeen(r); // 왼쪽 메뉴 NEW 지움
    } catch (x) { setErr((x as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit || busy) return;
    if (!edit.name.trim()) { alert('이름을 입력하세요'); return; }
    if (!edit.id && !edit.pw) { alert('비밀번호를 입력하세요'); return; }
    if (edit.pw && !/^[0-9]{4}$/.test(edit.pw)) { alert('비밀번호는 숫자 4자리예요'); return; }
    setBusy(true);
    try {
      await saveStaff({ id: edit.id, name: edit.name, pw: edit.pw, role: edit.role, active: edit.active });
      setEdit(null);
      await load();
    } catch (x) { alert('저장 실패: ' + (x as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(r: StaffRow) {
    if (!confirm(`${r.name} 계정을 지울까요? (다시 쓰려면 새로 만들어야 해요)`)) return;
    try { await deleteStaff(r.id); await load(); } catch (x) { alert('삭제 실패: ' + (x as Error).message); }
  }

  if (me.role !== 'admin') return <div className="p-6 text-sm text-gray-500">관리자만 볼 수 있어요</div>;

  return (
    <div className="p-5 max-w-[860px] space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">직원 계정</div>
            <div className="text-[12px] text-gray-500">직원이 처음 들어올 때 본명 + 숫자 4자리를 스스로 정해요 (일반으로 등록됨). 엘라·VMCE 같은 계정. 바꾸기·정지는 관리자만</div>
          </div>
          <button type="button" onClick={() => setEdit({ ...EMPTY })}
            className="px-3.5 py-1.5 rounded-md bg-indigo-600 text-white text-[13px] font-medium">+ 직원 추가</button>
        </div>
        {err && <div className="text-[12px] text-red-600 mb-2">{err}</div>}
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 font-medium">이름</th>
              <th className="py-2 font-medium">비밀번호</th>
              <th className="py-2 font-medium">역할 (받는 알림)</th>
              <th className="py-2 font-medium">상태</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-gray-900">{r.name}{r.name === me.name && <span className="ml-1 text-[11px] text-gray-400">(나)</span>}
                  {isNewStaff(r, seenAt) && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold align-middle">NEW</span>}
                  <div className="text-[11px] text-gray-400 font-normal">{new Date(r.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 등록</div>
                </td>
                <td className="py-2.5 font-mono tracking-widest text-gray-900">
                  {r.pin ?? <span className="font-sans tracking-normal text-[11px] text-gray-400">임시 비번 — 4자리로 바꿔 주세요</span>}
                </td>
                <td className="py-2.5 text-gray-700">
                  {ROLE_LABEL[r.role]}
                  <span className="ml-1 text-[11px] text-gray-400">
                    {r.role === 'buyer' ? '새 구매 등록·구매원함' : '사진 등록'}
                  </span>
                </td>
                <td className="py-2.5">
                  {r.active
                    ? <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[12px]">사용</span>
                    : <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[12px]">정지</span>}
                </td>
                <td className="py-2.5 text-right space-x-2">
                  <button type="button" onClick={() => setEdit({ id: r.id, name: r.name, pw: '', role: r.role, active: r.active })}
                    className="text-indigo-600 hover:underline">수정</button>
                  {r.name !== me.name && (
                    <button type="button" onClick={() => remove(r)} className="text-red-500 hover:underline">삭제</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4" onClick={() => !busy && setEdit(null)}>
          <div className="w-full max-w-[380px] bg-white rounded-xl shadow-xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="text-[15px] font-semibold">{edit.id ? '직원 수정' : '직원 추가'}</div>
            <label className="block">
              <span className="text-[12px] text-gray-600">이름 (채팅에도 이 이름으로 나와요)</span>
              <input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-[14px]" autoFocus />
            </label>
            <label className="block">
              <span className="text-[12px] text-gray-600">비밀번호 숫자 4자리 {edit.id && '(바꿀 때만 입력 — 바꾸면 그 사람은 다시 로그인)'}</span>
              <input value={edit.pw} inputMode="numeric" maxLength={4} onChange={e => setEdit({ ...edit, pw: e.target.value.replace(/\D/g, '') })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] font-mono tracking-widest" placeholder={edit.id ? '그대로 두려면 비워두기' : '예: 1234'} />
            </label>
            <label className="block">
              <span className="text-[12px] text-gray-600">역할</span>
              <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value as Role })}
                disabled={edit.name === me.name && edit.role === 'admin'}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-[14px]">
                <option value="staff">일반 — 사진 등록 알림</option>
                <option value="buyer">구매 담당 — 새 구매 등록·구매원함 알림</option>
                <option value="admin">관리자 — 직원 관리 가능 + 사진 등록 알림</option>
              </select>
            </label>
            {edit.id && edit.name !== me.name && (
              <label className="flex items-center gap-2 text-[13px] text-gray-700">
                <input type="checkbox" checked={!edit.active} onChange={e => setEdit({ ...edit, active: !e.target.checked })} />
                정지 (로그인 못 하게, 지금 접속도 끊김)
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEdit(null)} disabled={busy} className="px-3 py-1.5 rounded-md border border-gray-300 text-[13px]">취소</button>
              <button type="button" onClick={save} disabled={busy} className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-[13px] disabled:opacity-40">
                {busy ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
