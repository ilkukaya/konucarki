import { katla } from './slugify.ts';

export type YasakliTerim = { ham: string; duyarli: boolean; onek: boolean; kelimeler: string[] };

export function terimleriAyristir(metin: string): YasakliTerim[] {
  return metin
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .map((ham) => {
      let t = ham;
      const duyarli = t.startsWith('=');
      if (duyarli) t = t.slice(1);
      const onek = t.endsWith('*');
      if (onek) t = t.slice(0, -1);
      const kelimeler = duyarli ? kucuk(t).split(/\s+/) : katla(t).split(' ');
      return { ham, duyarli, onek, kelimeler };
    });
}

function kucuk(s: string): string {
  return s.toLocaleLowerCase('tr');
}

function kelimelereAyir(s: string, duyarli: boolean): string[] {
  if (duyarli) return kucuk(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return katla(s).split(' ').filter(Boolean);
}

/** Metinde geçen yasaklı terimleri döndürür (tam kelime; `*` ile önek eşleşmesi). */
export function yasakliBul(metin: string, terimler: YasakliTerim[]): string[] {
  const bulunan: string[] = [];
  const katli = kelimelereAyir(metin, false);
  const duyarli = kelimelereAyir(metin, true);
  for (const t of terimler) {
    const kel = t.duyarli ? duyarli : katli;
    const n = t.kelimeler.length;
    for (let i = 0; i + n <= kel.length; i++) {
      let eslesti = true;
      for (let j = 0; j < n; j++) {
        const son = j === n - 1;
        const w = kel[i + j];
        const hedef = t.kelimeler[j];
        if (son && t.onek ? !w.startsWith(hedef) : w !== hedef) {
          eslesti = false;
          break;
        }
      }
      if (eslesti) {
        bulunan.push(t.ham);
        break;
      }
    }
  }
  return bulunan;
}
