'use client';

/**
 * 도매 업체 관리 — 闲鱼 판매자 링크 · 취급 품목 · 우리 메모
 * DB 테이블: vendors (supabase_vendors.sql 로 만듦). 사이트(system)별로 따로 관리.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SYSTEM = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';
const CATS = ['가방', '의류', '시계', 'ACC'] as const;
type Cat = (typeof CATS)[number];

interface Vendor {
  id: string;
  name: string;
  url: string;
  categories: Cat[];
  memo: string;
  updated_at?: string;
}

const EMPTY: Omit<Vendor, 'id'> = { name: '', url: '', categories: [], memo: '' };

/** 闲鱼 판매자 링크를 깔끔하게 (userId 만 남김) */
function cleanUrl(u: string) {
  const s = u.trim();
  const id = s.match(/[?&]userId=(\d+)/)?.[1];
  return id && /goofish\.com/.test(s) ? `https://www.goofish.com/personal?userId=${id}` : s;
}

export default function VendorManager() {
  const [list, setList] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Cat | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Vendor | null>(null); // id '' = 새로 추가
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error: e } = await supabase
      .from('vendors')
      .select('*')
      .eq('system', SYSTEM)
      .order('updated_at', { ascending: false });
    if (e) {
      setError(/does not exist|relation|schema cache/i.test(e.message)
        ? 'DB에 도매 업체 표가 아직 없습니다. (supabase_vendors.sql 실행 필요)'
        : e.message);
    } else {
      setError(null);
      setList((data || []).map((r: any) => ({
        id: r.id, name: r.name || '', url: r.url || '', categories: r.categories || [], memo: r.memo || '', updated_at: r.updated_at,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of list) for (const k of v.categories) c[k] = (c[k] || 0) + 1;
    return c;
  }, [list]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return list
      .filter(v => !filter || v.categories.includes(filter))
      .filter(v => !qq || `${v.name} ${v.memo} ${v.url}`.toLowerCase().includes(qq));
  }, [list, filter, q]);

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) { alert('업체 이름을 입력하세요.'); return; }
    setSaving(true);
    const row = {
      system: SYSTEM,
      name,
      url: cleanUrl(editing.url),
      categories: editing.categories,
      memo: editing.memo.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error: e } = editing.id
      ? await supabase.from('vendors').update(row).eq('id', editing.id)
      : await supabase.from('vendors').insert([row]);
    setSaving(false);
    if (e) { alert('저장 실패: ' + e.message); return; }
    setEditing(null);
    load();
  };

  const remove = async (v: Vendor) => {
    if (!window.confirm(`«${v.name}» 업체를 삭제할까요?`)) return;
    const { error: e } = await supabase.from('vendors').delete().eq('id', v.id);
    if (e) { alert('삭제 실패: ' + e.message); return; }
    load();
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
      active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
    }`;
  const inp = 'w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      {/* 필터 · 검색 · 추가 */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-2">
        <button type="button" className={chip(filter === null)} onClick={() => setFilter(null)}>
          전체 <span className="opacity-60 ml-1">{list.length}</span>
        </button>
        {CATS.map(c => (
          <button key={c} type="button" className={chip(filter === c)} onClick={() => setFilter(filter === c ? null : c)}>
            {c} <span className="opacity-60 ml-1">{counts[c] || 0}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="업체명·메모 검색"
            className="h-9 w-[200px] px-3 text-[13px] border border-gray-300 rounded-md"
          />
          <button
            type="button"
            onClick={() => setEditing({ id: '', ...EMPTY, categories: filter ? [filter] : [] })}
            className="h-9 px-4 rounded-md bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
          >
            + 업체 추가
          </button>
        </div>
      </div>

      {/* 추가 / 수정 */}
      {editing && (
        <div className="bg-white border border-indigo-200 rounded-lg p-4">
          <div className="text-[14px] font-semibold text-gray-900 mb-3">{editing.id ? '업체 수정' : '새 업체'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">업체 이름 <span className="text-red-500">*</span></label>
              <input className={inp} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="闲鱼 닉네임 등" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">링크 (闲鱼 판매자 페이지)</label>
              <input className={inp} value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://www.goofish.com/personal?userId=…" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">취급 품목 (여러 개 가능)</label>
              <div className="flex gap-1.5">
                {CATS.map(c => {
                  const on = editing.categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, categories: on ? editing.categories.filter(x => x !== c) : [...editing.categories, c] })}
                      className={chip(on)}
                    >
                      {on ? '✓ ' : ''}{c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
              <textarea
                className="w-full h-24 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={editing.memo}
                onChange={e => setEditing({ ...editing, memo: e.target.value })}
                placeholder="가격대, 상태, 응대 속도, 거래 이력 등"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="h-9 px-4 rounded-md bg-gray-100 text-gray-700 text-sm">취소</button>
            <button type="button" disabled={saving} onClick={save} className="h-9 px-6 rounded-md bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">불러오는 중…</div>
        ) : error ? (
          <div className="p-6 text-sm text-amber-800 bg-amber-50">⚠️ {error}</div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {list.length === 0 ? '등록된 도매 업체가 없습니다. «+ 업체 추가»로 등록하세요.' : '조건에 맞는 업체가 없습니다.'}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[12px]">
                <th className="text-left font-semibold px-4 py-2.5 whitespace-nowrap">업체</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">품목</th>
                <th className="text-left font-semibold px-3 py-2.5">메모</th>
                <th className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">수정일</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map(v => (
                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{v.name}</div>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-indigo-600 hover:underline">
                        🐟 판매자 페이지 열기
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {v.categories.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 whitespace-pre-wrap max-w-[520px]">{v.memo || <span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{v.updated_at ? new Date(v.updated_at).toLocaleDateString('sv-SE') : ''}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button type="button" onClick={() => setEditing({ ...v })} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[12px] mr-1">수정</button>
                    <button type="button" onClick={() => remove(v)} className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[12px]">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
