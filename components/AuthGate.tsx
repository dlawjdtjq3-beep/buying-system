'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Me, checkMe, login, logout, savedMe } from '@/lib/auth';

/** 로그인해야 화면이 보임. 안쪽에서는 useAuth() 로 지금 사람 이름·역할 */
const AuthCtx = createContext<{ me: Me; signOut: () => void } | null>(null);
export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('AuthGate 밖에서 useAuth 사용');
  return v;
}

const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';
const LAST_NAME = 'buying-last-login-name';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const m = savedMe();
    if (m) setMe(m); // 저장된 걸로 먼저 바로 보여주고
    checkMe().then(v => { setMe(v); setReady(true); }); // 뒤에서 유효한지 확인 (정지·비번변경이면 로그인 화면)
    try { setName(window.localStorage.getItem(LAST_NAME) || ''); } catch { /* 무시 */ }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pw || busy) return;
    setBusy(true); setErr('');
    try {
      const m = await login(name, pw);
      if (!m) { setErr('이름 또는 비밀번호가 맞지 않아요'); setPw(''); }
      else {
        try { window.localStorage.setItem(LAST_NAME, m.name); } catch { /* 무시 */ }
        setMe(m);
      }
    } catch (x) {
      setErr('로그인 실패: ' + (x as Error).message);
    } finally { setBusy(false); }
  }

  if (me) {
    return (
      <AuthCtx.Provider value={{ me, signOut: async () => { await logout(); setMe(null); setPw(''); } }}>
        {children}
      </AuthCtx.Provider>
    );
  }
  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">확인 중…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={submit} className="w-full max-w-[340px] bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <div className="text-[18px] font-bold text-gray-900">{systemName === 'vmce' ? 'VMCE' : '엘라'} 구매관리</div>
          <div className="text-[12px] text-gray-500 mt-1">관리자가 만들어 준 이름과 비밀번호로 들어오세요</div>
        </div>
        <label className="block">
          <span className="text-[12px] text-gray-600">이름</span>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus={!name}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-[14px]" placeholder="예: 엄봉희" />
        </label>
        <label className="block">
          <span className="text-[12px] text-gray-600">비밀번호</span>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus={!!name}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-[14px]" />
        </label>
        {err && <div className="text-[12px] text-red-600">{err}</div>}
        <button type="submit" disabled={busy || !name.trim() || !pw}
          className="w-full py-2.5 rounded-md bg-indigo-600 text-white text-[14px] font-medium disabled:opacity-40">
          {busy ? '확인 중…' : '로그인'}
        </button>
        <div className="text-[11px] text-gray-400">비밀번호를 잊으면 관리자에게 바꿔 달라고 하세요</div>
      </form>
    </div>
  );
}
