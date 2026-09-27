// Yıldız serpintisi: çini yıldızları kısa bir an saçılır. Hareket azaltma tercihinde hiç çalışmaz.
// Konumlar CSS değişkenleriyle (setProperty) verilir; style="" özniteliği yok.

const RENKLER = ['var(--kobalt)', 'var(--firuze)', 'var(--firuze-acik)', 'var(--mercan)'];

export function yildizSerpintisi(kap: HTMLElement, adet = 22, buyuk = false): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const katman = document.createElement('div');
  katman.className = 'serpinti';
  katman.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < adet; i++) {
    const y = document.createElement('span');
    const aci = (Math.PI * 2 * i) / adet + Math.random() * 0.5;
    const uzaklik = (buyuk ? 140 : 90) + Math.random() * (buyuk ? 160 : 90);
    y.style.setProperty('--dx', `${Math.cos(aci) * uzaklik}px`);
    y.style.setProperty('--dy', `${Math.sin(aci) * uzaklik - 40}px`);
    y.style.setProperty('--don', `${Math.round(Math.random() * 360 - 180)}deg`);
    y.style.setProperty('--boy', `${8 + Math.random() * (buyuk ? 12 : 8)}px`);
    y.style.setProperty('--gecikme', `${Math.random() * 120}ms`);
    y.style.setProperty('--renk', RENKLER[i % RENKLER.length]);
    katman.append(y);
  }
  kap.append(katman);
  window.setTimeout(() => katman.remove(), 1600);
}
