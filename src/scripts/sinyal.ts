// Titreşim ve ekranın açık kalması (sesler ses.ts içinde). Hepsi destek yoksa sessizce geçer.

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
