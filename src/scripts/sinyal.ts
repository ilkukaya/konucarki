// Süre bitişi sinyalleri ve ekranın açık kalması. Hepsi destek yoksa sessizce geçer.

let ctx: AudioContext | null = null;

/** Kullanıcı etkileşimi sırasında çağrılmalı; tarayıcılar sesi ancak böyle açar. */
export function sesiHazirla(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function bip(kez = 2): void {
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < kez; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === kez - 1 ? 880 : 660;
      const t = t0 + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.2);
    }
  } catch {
    /* ses yok */
  }
}

export function titret(): void {
  try {
    navigator.vibrate?.(200);
  } catch {
    /* yok */
  }
}

type Kilit = { release(): Promise<void>; released: boolean };
let kilit: Kilit | null = null;
let istek = false;

export async function ekranAcikKalsin(acik: boolean): Promise<void> {
  istek = acik;
  const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<Kilit> } }).wakeLock;
  if (!wl) return;
  try {
    if (acik && (!kilit || kilit.released)) kilit = await wl.request('screen');
    else if (!acik && kilit) {
      await kilit.release();
      kilit = null;
    }
  } catch {
    /* izin yok ya da desteklenmiyor */
  }
}

// Sekme görünür olunca kilit düşmüş olabilir; istenmişse yeniden al.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && istek) void ekranAcikKalsin(true);
});
