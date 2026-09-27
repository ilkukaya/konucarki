// Oyunlaştırma: tur puanı, seviyeler, günün görevi. Saf fonksiyonlar; depolama yok.
import type { Mod } from './ilerleme.ts';
import { fnv1a } from './tarih.ts';

export type TurSonucu = {
  mod: Mod;
  zorluk?: 1 | 2 | 3;
  alan?: string;
  pasKullanildi: boolean;
  konusmaMs: number;
  hedefMs: number;
  meydan: boolean; // meydan okuma kartıyla oynandı
  gorevTamam: boolean; // bugünün görevi bu turla tamamlandı
  alkis?: number; // grup modunda 0–3
};

export type PuanKalemi = { ad: string; puan: number };

/** Sonuna kadar konuşmuş sayılmak için hedef sürenin bu oranı yeterli. */
export const TAM_SURE_ORANI = 0.95;

export function tamSureMi(t: Pick<TurSonucu, 'konusmaMs' | 'hedefMs'>): boolean {
  return t.hedefMs > 0 && t.konusmaMs >= t.hedefMs * TAM_SURE_ORANI;
}

export function turPuani(t: TurSonucu): PuanKalemi[] {
  const k: PuanKalemi[] = [{ ad: 'Turu tamamladın', puan: 10 }];
  if (t.mod === 'arastirma' && t.zorluk === 2) k.push({ ad: 'Orta konu', puan: 5 });
  if (t.mod === 'arastirma' && t.zorluk === 3) k.push({ ad: 'Zor konu', puan: 10 });
  if (!t.pasKullanildi) k.push({ ad: 'Pas kullanmadan', puan: 5 });
  if (tamSureMi(t)) k.push({ ad: 'Sonuna kadar konuştun', puan: 5 });
  if (t.meydan) k.push({ ad: 'Meydan okuma kartı', puan: 10 });
  if (t.gorevTamam) k.push({ ad: 'Günün görevi', puan: 20 });
  if (t.alkis && t.alkis > 0) k.push({ ad: `Alkış × ${t.alkis}`, puan: t.alkis * 5 });
  return k;
}

export const toplamPuan = (k: PuanKalemi[]): number => k.reduce((s, x) => s + x.puan, 0);

// ---------- Seviyeler ----------

export const SEVIYELER: { ad: string; xp: number }[] = [
  { ad: 'Çırak', xp: 0 },
  { ad: 'Meraklı', xp: 60 },
  { ad: 'Anlatıcı', xp: 160 },
  { ad: 'Hikâyeci', xp: 320 },
  { ad: 'Söz ustası', xp: 550 },
  { ad: 'Meddah', xp: 850 },
  { ad: 'Bilge', xp: 1250 },
];
const SON_ADIM = 500;
const ROMA = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export type SeviyeBilgisi = { sira: number; ad: string; alt: number; ust: number; oran: number; sonraki: string };

export function seviye(xp: number): SeviyeBilgisi {
  const x = Math.max(0, Math.floor(xp));
  const son = SEVIYELER[SEVIYELER.length - 1];
  if (x >= son.xp) {
    const ek = Math.floor((x - son.xp) / SON_ADIM);
    const alt = son.xp + ek * SON_ADIM;
    const ad = ek ? `${son.ad} ${ROMA[ek] ?? ek + 1}` : son.ad;
    return { sira: SEVIYELER.length + ek, ad, alt, ust: alt + SON_ADIM, oran: (x - alt) / SON_ADIM, sonraki: `${son.ad} ${ROMA[ek + 1] ?? ek + 2}` };
  }
  let i = 0;
  while (i + 1 < SEVIYELER.length && x >= SEVIYELER[i + 1].xp) i++;
  const alt = SEVIYELER[i].xp;
  const ust = SEVIYELER[i + 1].xp;
  return { sira: i + 1, ad: SEVIYELER[i].ad, alt, ust, oran: (x - alt) / (ust - alt), sonraki: SEVIYELER[i + 1].ad };
}

// ---------- Günün görevi ----------

export type GorevTipi = 'zor' | 'passiz' | 'dogaclama' | 'atasozu' | 'meydan' | 'tamsure' | 'alan';
export type Gorev = { tip: GorevTipi; metin: string; alan?: string };

const GOREV_TIPLERI: GorevTipi[] = ['zor', 'passiz', 'dogaclama', 'atasozu', 'meydan', 'tamsure', 'alan'];

/** Tarihe dayalı deterministik görev: herkes aynı gün aynı görevi görür. */
export function gununGorevi(gun: string, alanlar: { id: string; ad: string }[]): Gorev {
  const tip = GOREV_TIPLERI[fnv1a(`gorev:${gun}`) % GOREV_TIPLERI.length];
  switch (tip) {
    case 'zor':
      return { tip, metin: 'Araştırma modunda "Zor" bir konu anlat.' };
    case 'passiz':
      return { tip, metin: 'Hiç pas kullanmadan bir tur tamamla.' };
    case 'dogaclama':
      return { tip, metin: 'Doğaçlama modunda bir tur tamamla.' };
    case 'atasozu':
      return { tip, metin: 'Bir atasözünü ya da deyimi anlat.' };
    case 'meydan':
      return { tip, metin: 'Bir meydan okuma kartıyla turu bitir.' };
    case 'tamsure':
      return { tip, metin: 'Konuşma süresini sonuna kadar doldur.' };
    case 'alan': {
      const a = alanlar[fnv1a(`alan:${gun}`) % alanlar.length];
      return { tip, alan: a.id, metin: `"${a.ad}" alanından bir konu anlat.` };
    }
  }
}

export function gorevTamamMi(g: Gorev, t: Omit<TurSonucu, 'gorevTamam'>): boolean {
  switch (g.tip) {
    case 'zor':
      return t.mod === 'arastirma' && t.zorluk === 3;
    case 'passiz':
      return !t.pasKullanildi;
    case 'dogaclama':
      return t.mod === 'dogaclama';
    case 'atasozu':
      return t.mod === 'atasozu';
    case 'meydan':
      return t.meydan;
    case 'tamsure':
      return tamSureMi(t);
    case 'alan':
      return t.mod === 'arastirma' && t.alan === g.alan;
  }
}
