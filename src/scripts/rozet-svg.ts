// Rozet ikonları: sade, çini motifli SVG'ler. Inline style yok; renkler CSS sınıflarıyla.
import type { RozetId } from '../lib/ilerleme.ts';

const NS = 'http://www.w3.org/2000/svg';

// Her rozet, sekiz köşeli yıldız zemin üzerinde küçük bir sembol taşır.
const SEMBOL: Record<RozetId, string> = {
  'ilk-tur': 'M-4 5 L-4 -5 L5 0 Z', // oynat üçgeni
  'bes-alan': 'M0 -6 L1.8 -1.9 L6 -1.9 L2.6 0.8 L3.8 5 L0 2.5 L-3.8 5 L-2.6 0.8 L-6 -1.9 L-1.8 -1.9 Z', // beş köşe
  'seri-3': 'M-6 -1h3v2h-3zM-1.5 -1h3v2h-3zM3 -1h3v2h-3z', // üç çizgi
  'seri-7': 'M-6 -4h2v8h-2zM-2.5 -4h2v8h-2zM1 -4h2v8h-2zM4.5 -4h2v8h-2z', // dört dikey (hafta)
  'passiz-5': 'M-5 0 L-1.5 4 L5.5 -4', // tik
  'ilk-zor': 'M-6 5 L0 -5 L6 5 Z', // dağ
  'atasozu-10': 'M-6 -4 H6 V3 H0 L-3 6 V3 H-6 Z', // konuşma balonu
  'on-alan': 'M0 -6 L2 -2 L6 0 L2 2 L0 6 L-2 2 L-6 0 L-2 -2 Z', // pusula yıldızı
  'dogaclama-10': 'M-6 -5 H2 V1 H-2 L-4 3 V1 H-6 Z M3 -2 H6 V4 H5 V6 L3 4 H0 V2 H3 Z', // iki balon
  'meydan-5': 'M1 -6 L-4 1 H0 L-1 6 L4 -1 H0 Z', // şimşek
  'gorev-3': 'M-4 -6 H-2.5 V6 H-4 Z M-2.5 -6 H5 L3 -3 L5 0 H-2.5 Z', // bayrak
};

export function rozetSvg(id: RozetId, kazanildi = true): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-16 -16 32 32');
  svg.setAttribute('width', '56');
  svg.setAttribute('height', '56');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('rozet', kazanildi ? 'kazanildi' : 'kilitli');
  for (const r of [0, 45]) {
    const k = document.createElementNS(NS, 'rect');
    k.setAttribute('x', '-11');
    k.setAttribute('y', '-11');
    k.setAttribute('width', '22');
    k.setAttribute('height', '22');
    k.setAttribute('transform', `rotate(${r})`);
    k.classList.add('rozet-zemin');
    svg.append(k);
  }
  const ic = document.createElementNS(NS, 'circle');
  ic.setAttribute('r', '9.5');
  ic.classList.add('rozet-ic');
  const s = document.createElementNS(NS, 'path');
  s.setAttribute('d', SEMBOL[id]);
  s.classList.add(id === 'passiz-5' ? 'rozet-cizgi' : 'rozet-sembol');
  svg.append(ic, s);
  return svg;
}
