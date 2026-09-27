// Çark geometrisi: hem build'de (ilk SVG) hem istemcide (mod değişince) kullanılır.
// Açılar derece, 0 = saat 12 yönü, saat yönünde artar.

export const YARICAP = 100;
const IC_YARICAP = 22;

export type Dilim = { id: string; etiket: string };

function nokta(r: number, aci: number): [number, number] {
  const rad = ((aci - 90) * Math.PI) / 180;
  return [+(r * Math.cos(rad)).toFixed(3), +(r * Math.sin(rad)).toFixed(3)];
}

/** i. dilimin halka biçimli yolu. */
export function dilimYolu(i: number, n: number, r = YARICAP, ic = IC_YARICAP): string {
  const s = 360 / n;
  const a0 = i * s;
  const a1 = a0 + s;
  const [x0, y0] = nokta(r, a0);
  const [x1, y1] = nokta(r, a1);
  const [x2, y2] = nokta(ic, a1);
  const [x3, y3] = nokta(ic, a0);
  const buyuk = s > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${buyuk} 1 ${x1} ${y1}L${x2} ${y2}A${ic} ${ic} 0 ${buyuk} 0 ${x3} ${y3}Z`;
}

/** Etiket konumu: yarıçap boyunca; sol yarıdaki etiketler ters dönmesin diye 180° çevrilir. */
export function etiket(i: number, n: number, r = YARICAP): { donus: string; x: number; capa: 'start' | 'end' } {
  const orta = dilimOrtasi(i, n);
  const x = r - 9;
  if (orta > 180) return { donus: `rotate(${+(orta + 90).toFixed(3)})`, x: -x, capa: 'start' };
  return { donus: `rotate(${+(orta - 90).toFixed(3)})`, x, capa: 'end' };
}

export function dilimOrtasi(i: number, n: number): number {
  const s = 360 / n;
  return i * s + s / 2;
}

/**
 * Çarkı `simdiki` açısından en az `tur` tam dönüş yapıp i. dilimde durduracak yeni açı.
 * `sapma` [-0.5, 0.5] aralığında: dilim içinde durma noktası (kenarlara çok yaklaşmamak için 0.7 ile ölçeklenir).
 */
export function hedefAci(simdiki: number, i: number, n: number, tur = 4, sapma = 0): number {
  const s = 360 / n;
  const hedef = -(dilimOrtasi(i, n) + sapma * 0.7 * s);
  const fark = (((hedef - simdiki) % 360) + 360) % 360;
  return simdiki + tur * 360 + fark;
}

/** Verilen açıda göstergenin (saat 12) altında kalan dilim. */
export function aciDilimi(aci: number, n: number): number {
  const s = 360 / n;
  const a = (((-aci) % 360) + 360) % 360;
  return Math.floor(a / s) % n;
}
