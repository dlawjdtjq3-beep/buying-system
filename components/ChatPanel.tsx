'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { bumpTitle } from '@/lib/notify';
import { playDingDong } from '@/lib/sound';
import { useAuth } from '@/components/AuthGate';
import { chatFolder, fileToDataUrl, uploadChatPhoto } from '@/lib/gallery';
import { compressVideo, isVideoFile, isVideoUrl, uploadVideoBlob } from '@/lib/video';
import { thumbUrl } from '@/lib/image';

/**
 * 상단 [💬 채팅] — 직원끼리 실시간 대화 (표: chat_messages, 이 사이트(system) 것만)
 * - 이름 = 로그인 이름 (components/AuthGate)
 * - 새 글이 오면: 버튼에 빨간 숫자 + 오른쪽 알림(ToastStack, 띵동) + 컴퓨터(크롬) 알림 (내가 쓴 건 제외)
 */
const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';
const SEEN_KEY = `buying-chat-seen-${systemName}`;
const MUTE_KEY = 'buying-chat-mute';
const WIDE = 900; // 이보다 넓은 화면에서는 채팅창을 항상 켜서 옆에 붙여 두고 본문을 비켜줌

interface Msg { id: number; author: string; body: string; created_at: string; image_url?: string | null }
const COLS = 'id, author, body, created_at, image_url';

const ls = {
  get(k: string) { try { return window.localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k: string, v: string) { try { window.localStorage.setItem(k, v); } catch { /* 무시 */ } },
};

function hhmm(s: string) {
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dayLabel(s: string) {
  const d = new Date(s);
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const name = useAuth().me.name; // 채팅 이름 = 로그인 이름 (직원이 못 바꿈)
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [seen, setSeen] = useState(0);
  const [perm, setPerm] = useState<string>('default');
  const [mute, setMute] = useState(false);
  const [uploading, setUploading] = useState(0); // 올리는 중인 사진 수
  const [vidProg, setVidProg] = useState(''); // 동영상 줄이는 진행
  const [bigImg, setBigImg] = useState<string | null>(null); // 크게 보기
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const nameRef = useRef('');
  const muteRef = useRef(false);
  openRef.current = open;
  nameRef.current = name;
  muteRef.current = mute;

  useEffect(() => {
    setSeen(Number(ls.get(SEEN_KEY)) || 0);
    setMute(ls.get(MUTE_KEY) === '1');
    setPerm('Notification' in window ? Notification.permission : 'unsupported');
    // 채팅창은 들어올 때마다 항상 켜둠 (넓은 화면). ✕로 닫아도 새로고침하면 다시 켜짐 — 대표님 요청 10/23
    if (window.innerWidth >= WIDE) setOpen(true);
    const openMe = () => setOpen(true); // 오른쪽 알림을 누르면 채팅창 열기
    window.addEventListener('buying-chat-open', openMe);
    return () => window.removeEventListener('buying-chat-open', openMe);
  }, []);

  // 처음: 최근 200개 불러오기 + 실시간 구독
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select(COLS)
        .eq('system', systemName)
        .order('id', { ascending: false })
        .limit(200);
      if (alive && data) setMsgs(prev => merge(prev, (data as Msg[]).reverse()));
    })();

    const ch = supabase
      .channel(`chat-${systemName}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `system=eq.${systemName}` }, (payload: any) => {
        const m = payload.new as Msg;
        setMsgs(prev => merge(prev, [m]));
        if (m.author === nameRef.current) return; // 내가 쓴 건 알림 안 함
        const watching = openRef.current && document.hasFocus() && !document.hidden;
        if (watching) { playDingDong(); return; } // 채팅창 보고 있으면 알림창 없이 소리만
        window.dispatchEvent(new CustomEvent('buying-chat', { detail: m })); // 오른쪽 알림 + 띵동 (ToastStack)
        if (!muteRef.current && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(`💬 ${m.author || '직원'}`, { body: (m.body || (isVideoUrl(m.image_url) ? '🎬 동영상' : '📷 사진')).slice(0, 120), icon: m.image_url && !isVideoUrl(m.image_url) ? m.image_url : undefined, tag: `chat-${m.id}` });
            n.onclick = () => { window.focus(); setOpen(true); n.close(); };
          } catch { /* 무시 */ }
        }
        if (document.hidden || !document.hasFocus()) bumpTitle();
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  // 넓은 화면에서 열려 있으면 본문을 채팅창 폭만큼 비켜줌 (globals.css body.chat-docked)
  useEffect(() => {
    const apply = () => document.body.classList.toggle('chat-docked', open && window.innerWidth >= WIDE);
    apply();
    window.addEventListener('resize', apply);
    return () => { window.removeEventListener('resize', apply); document.body.classList.remove('chat-docked'); };
  }, [open]);

  // 창이 열려 있으면 맨 아래로 + 읽음 처리
  useEffect(() => {
    if (!open) return;
    const last = msgs.length ? msgs[msgs.length - 1].id : 0;
    if (last > seen) { setSeen(last); ls.set(SEEN_KEY, String(last)); }
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [open, msgs, seen]);

  const unread = useMemo(
    () => (open ? 0 : msgs.filter(m => m.id > seen && m.author !== name).length),
    [msgs, seen, name, open],
  );

  async function send(imageUrl?: string) {
    const body = imageUrl ? '' : text.trim();
    if ((!body && !imageUrl) || sending || !name) return;
    setSending(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ system: systemName, author: name, body, image_url: imageUrl || null })
      .select(COLS)
      .single();
    setSending(false);
    if (error) { alert('보내기 실패: ' + error.message); return; }
    if (!imageUrl) setText('');
    if (data) setMsgs(prev => merge(prev, [data as Msg]));
  }

  /** 사진·동영상 보내기 — 사진은 1000px, 동영상은 720p(1분까지)로 줄여서 올리고 한 개씩 보냄 */
  async function sendPhotos(files: File[]) {
    const list = files.filter(f => f.type.startsWith('image/') || isVideoFile(f)).slice(0, 10);
    if (!list.length || !name) return;
    setUploading(list.length);
    try {
      for (const f of list) {
        let url: string;
        if (isVideoFile(f)) {
          const { blob, ext } = await compressVideo(f, p => setVidProg(`🎬 동영상 줄이는 중 ${Math.round(p * 100)}% (이 창을 띄워 두세요)`));
          setVidProg('🎬 동영상 올리는 중…');
          url = await uploadVideoBlob(chatFolder(), blob, ext);
          setVidProg('');
        } else {
          url = await uploadChatPhoto(await fileToDataUrl(f));
        }
        await send(url);
        setUploading(n => Math.max(0, n - 1));
      }
    } catch (x) {
      alert('올리기 실패: ' + ((x as Error)?.message || x));
    } finally { setUploading(0); setVidProg(''); }
  }

  async function askPerm() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'denied') alert('크롬이 이 사이트 알림을 막고 있어요.\n주소창 왼쪽 자물쇠 → 알림 → «허용»으로 바꾼 뒤 새로고침하세요.');
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`relative px-3 py-1.5 rounded-md text-[13px] font-medium border ${
          open ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        💬 채팅
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`fixed right-0 top-14 bottom-0 z-40 w-full sm:w-[380px] bg-white border-l shadow-2xl flex flex-col ${dragOver ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200'}`}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); sendPhotos(Array.from(e.dataTransfer.files)); }}
        >
          <div className="h-11 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
            <div className="text-[14px] font-semibold text-gray-900">💬 직원 채팅</div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500">{name}</span>
              <button type="button" title="잠깐 닫기 (새로고침하면 다시 켜져요)" onClick={() => setOpen(false)} className="w-7 h-7 rounded hover:bg-gray-100 text-gray-500">✕</button>
            </div>
          </div>

          {perm !== 'granted' && perm !== 'unsupported' && (
            <button type="button" onClick={askPerm} className="mx-3 mt-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800 text-left">
              🔔 새 글이 오면 컴퓨터 알림 받기 — 여기를 눌러 «허용»해 주세요
            </button>
          )}
          {perm === 'granted' && (
            <label className="mx-3 mt-2 flex items-center gap-2 text-[12px] text-gray-500">
              <input type="checkbox" checked={!mute} onChange={e => { const m = !e.target.checked; setMute(m); ls.set(MUTE_KEY, m ? '1' : '0'); }} />
              새 글 컴퓨터 알림 받기
            </label>
          )}

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            {msgs.length === 0 && <div className="text-center text-[12px] text-gray-400 mt-10">아직 대화가 없어요</div>}
            {msgs.map((m, i) => {
              const prev = msgs[i - 1];
              const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
              const mine = m.author === name;
              const showName = !mine && (newDay || !prev || prev.author !== m.author);
              return (
                <div key={m.id}>
                  {newDay && <div className="text-center text-[11px] text-gray-400 my-2">{dayLabel(m.created_at)}</div>}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {showName && <div className="text-[11px] text-gray-500 mb-0.5 ml-1">{m.author || '직원'}</div>}
                      <div className={`flex items-end gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        {m.image_url && isVideoUrl(m.image_url) ? (
                          <video src={m.image_url} controls playsInline preload="metadata" className="max-w-[240px] max-h-[280px] rounded-xl bg-black" />
                        ) : m.image_url ? (
                          <button type="button" onClick={() => setBigImg(m.image_url!)} className="block rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <img src={thumbUrl(m.image_url, 440, 70)} alt="" loading="lazy" className="max-w-[220px] max-h-[260px] object-cover" />
                          </button>
                        ) : (
                          <div className={`px-3 py-1.5 rounded-2xl text-[13px] whitespace-pre-wrap break-words ${mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                            {m.body}
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 shrink-0">{hhmm(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 p-3 shrink-0">
            {uploading > 0 && <div className="text-[11px] text-indigo-600 mb-1.5">{vidProg || `📷 줄여서 올리는 중… (${uploading}개 남음)`}</div>}
            {(
              <div className="flex gap-2 items-end">
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
                  onChange={e => { sendPhotos(Array.from(e.target.files || [])); e.target.value = ''; }} />
                <button type="button" title="사진 보내기 (끌어다 놓기·Ctrl+V 도 돼요)" onClick={() => fileRef.current?.click()}
                  disabled={uploading > 0}
                  className="h-[52px] w-10 shrink-0 rounded-md border border-gray-300 text-[18px] hover:bg-gray-50 disabled:opacity-40">📷</button>
                <textarea
                  value={text}
                  onPaste={e => {
                    const files = Array.from(e.clipboardData.files || []).filter(f => f.type.startsWith('image/'));
                    if (files.length) { e.preventDefault(); sendPhotos(files); }
                  }}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
                  }}
                  rows={2}
                  placeholder="메시지 (Enter 보내기, Shift+Enter 줄바꿈)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-[13px] resize-none"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={sending || !text.trim()}
                  className="px-3 py-2 rounded-md bg-indigo-600 text-white text-[13px] disabled:opacity-40"
                >
                  보내기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 채팅 사진 크게 보기 — 아무 데나 누르거나 Esc 로 닫기 */}
      {bigImg && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setBigImg(null)}
          onKeyDown={e => { if (e.key === 'Escape') setBigImg(null); }} tabIndex={-1} ref={el => el?.focus()}>
          <img src={bigImg} alt="" className="max-w-[94vw] max-h-[90vh] object-contain rounded" />
          <a href={bigImg} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="absolute top-4 right-4 px-3 py-1.5 rounded bg-white/90 text-[12px] text-gray-800">새 창으로 보기</a>
        </div>
      )}
    </div>
  );
}

/** id 기준으로 합치고 정렬 (실시간·내가 보낸 것 중복 방지) */
function merge(a: Msg[], b: Msg[]): Msg[] {
  const map = new Map<number, Msg>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return Array.from(map.values()).sort((x, y) => x.id - y.id);
}
