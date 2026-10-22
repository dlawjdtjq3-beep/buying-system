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

/**
 * 누가 어떤 알림을 받나 (채팅에 쓴 이름으로 구분)
 * - 구매 담당(엄봉희): «새 구매 등록» + «구매원함» 알림
 * - 나머지: «사진 등록» 알림
 */
export type AlertKind = 'photo' | 'new' | 'want';
const BUYERS = ['엄봉희'];
export function isBuyer(): boolean {
  try { return BUYERS.includes((window.localStorage.getItem('buying-chat-name') || '').trim()); } catch { return false; }
}
export function wantsAlert(kind: AlertKind): boolean {
  return isBuyer() ? kind === 'new' || kind === 'want' : kind === 'photo';
}
export const ALERT_TITLE: Record<AlertKind, string> = {
  photo: '📷 사진 등록됐어요',
  new: '🆕 새 구매 등록',
  want: '🛒 구매원함',
};

/** 화면 안 알림창(오른쪽)에 띄우기 — 윈도우 알림 설정과 상관없이 항상 보임 */
export function emitPhotoToast(r: PhotoRow, self = false, kind: AlertKind = 'photo') {
  try { window.dispatchEvent(new CustomEvent('buying-photo', { detail: { ...r, self, kind } })); } catch { /* 무시 */ }
}

/** 다른 사람이 바꾼 것 → 받을 사람이면 화면 알림창 + 크롬(윈도우) 알림 */
export function notifyPurchaseAlert(kind: AlertKind, r: PhotoRow) {
  if (!wantsAlert(kind)) return;
  emitPhotoToast(r, false, kind);
  if (notifyState() !== 'on') return;
  try {
    const n = new Notification(`${ALERT_TITLE[kind]} #${r.application_number ?? ''}`, {
      body: [r.applicant, r.product_name, r.amount ? `¥${Number(r.amount).toLocaleString()}` : '']
        .filter(Boolean).join(' · '),
      icon: r.image_url || undefined,
      tag: `${kind}-${r.id}`, // 같은 건이 여러 번 와도 하나만
    });
    n.onclick = () => { window.focus(); n.close(); };
    if (document.hidden || !document.hasFocus()) bumpTitle();
  } catch { /* 알림 실패는 무시 */ }
}
