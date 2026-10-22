/**
 * 크롬 알림 — 구매여부가 «사진 등록»으로 바뀌면 이 사이트를 열어둔 사람에게 알림
 * - 사람(브라우저)마다 [🔔 알림] 버튼으로 켜고 끔 (기억: localStorage)
 * - 사이트 탭이 열려 있어야 옴 (다른 탭을 보고 있거나 창이 내려가 있어도 옴, 탭을 닫으면 안 옴)
 * - 내가 바꾼 건 나한테는 안 옴
 */
const KEY = 'buying-notify-photo';

export type NotifyState = 'unsupported' | 'blocked' | 'off' | 'on';

export function notifyState(): NotifyState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  let want = false;
  try { want = window.localStorage.getItem(KEY) === '1'; } catch { /* 무시 */ }
  return Notification.permission === 'granted' && want ? 'on' : 'off';
}

export async function turnOnNotify(): Promise<NotifyState> {
  if (!('Notification' in window)) return 'unsupported';
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (p === 'granted') {
    try { window.localStorage.setItem(KEY, '1'); } catch { /* 무시 */ }
    return 'on';
  }
  return p === 'denied' ? 'blocked' : 'off';
}

export function turnOffNotify(): NotifyState {
  try { window.localStorage.setItem(KEY, '0'); } catch { /* 무시 */ }
  return 'off';
}

// 탭 제목 앞에 안 본 알림 수 표시 «(2) …» — 이 탭을 다시 보면 지움
let unread = 0;
let baseTitle = '';
export function bumpTitle() {
  if (!baseTitle) baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
  unread += 1;
  document.title = `(${unread}) ${baseTitle}`;
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (unread) { unread = 0; document.title = baseTitle; }
  });
}

export interface PhotoRow {
  id: string;
  application_number?: number;
  applicant?: string;
  product_name?: string;
  amount?: number;
  image_url?: string | null;
}

/** 화면 안 알림창(알림 버튼 밑)에 띄우기 — 윈도우 알림 설정과 상관없이 항상 보임 */
export function emitPhotoToast(r: PhotoRow, self = false) {
  try { window.dispatchEvent(new CustomEvent('buying-photo', { detail: { ...r, self } })); } catch { /* 무시 */ }
}

/** 다른 사람이 사진 등록 → 화면 알림창 + 크롬(윈도우) 알림 */
export function notifyPhotoRegistered(r: PhotoRow) {
  emitPhotoToast(r, false);
  if (notifyState() !== 'on') return;
  try {
    const n = new Notification(`📷 사진 등록 #${r.application_number ?? ''}`, {
      body: [r.applicant, r.product_name, r.amount ? `¥${Number(r.amount).toLocaleString()}` : '']
        .filter(Boolean).join(' · '),
      icon: r.image_url || undefined,
      tag: `photo-${r.id}`, // 같은 건이 여러 번 와도 하나만
    });
    n.onclick = () => { window.focus(); n.close(); };
    if (document.hidden || !document.hasFocus()) bumpTitle();
  } catch { /* 알림 실패는 무시 */ }
}
