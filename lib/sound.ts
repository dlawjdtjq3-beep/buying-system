/**
 * 알림음 «띵-동» — 소리 파일 없이 브라우저에서 직접 만듦 (Web Audio)
 * - 크롬은 사용자가 페이지를 한 번이라도 누르기 전에는 소리를 막음 → 첫 클릭 때 미리 깨워둠
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

if (typeof window !== 'undefined') {
  const wake = () => { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('keydown', wake);
}

function tone(c: AudioContext, freq: number, start: number, dur: number, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

let last = 0;
/** 띵-동 (짧은 시간에 여러 번 와도 0.8초에 한 번만) */
export function playDingDong() {
  const now = Date.now();
  if (now - last < 800) return;
  last = now;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const t = c.currentTime + 0.02;
  tone(c, 1318.5, t, 0.35, 0.28);        // 띵 (E6)
  tone(c, 1046.5, t + 0.16, 0.55, 0.28); // 동 (C6)
}
