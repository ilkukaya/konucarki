// localStorage sarmalayıcısı. Tüm anahtarlar `kc:v1:` önekli.
// Erişim her an hata verebilir (gizli pencere, engellenmiş site verisi); sessizce geçilir.
import { BOS_OZET, type Ozet, type Tur } from './ilerleme.ts';

export const ONEK = 'kc:';
const V = 'kc:v1:';

function ls(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function oku<T>(anahtar: string, varsayilan: T): T {
  try {
    const ham = ls()?.getItem(V + anahtar);
    return ham == null ? varsayilan : (JSON.parse(ham) as T);
  } catch {
    return varsayilan;
  }
}

export function yaz(anahtar: string, deger: unknown): void {
  try {
    ls()?.setItem(V + anahtar, JSON.stringify(deger));
  } catch {
    /* depolama yok ya da dolu: ayar bu oturumla sınırlı kalır */
  }
}

export function sil(anahtar: string): void {
  try {
    ls()?.removeItem(V + anahtar);
  } catch {
    /* yok say */
  }
}

/** `kc:` önekli her şeyi siler (tüm sürümler). */
export function tumunuSil(): number {
  const s = ls();
  if (!s) return 0;
  const silinecek: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(ONEK)) silinecek.push(k);
    }
    for (const k of silinecek) s.removeItem(k);
  } catch {
    /* yok say */
  }
  return silinecek.length;
}

// ---- Zorunlu işlevsel ayarlar ----

export type Ayarlar = {
  mod: 'arastirma' | 'dogaclama' | 'atasozu';
  arastirmaDk: number;
  arastirmaKonusmaDk: number;
  dogaclamaHazirlikSn: number;
  dogaclamaKonusmaDk: number;
  atasozuHazirlikSn: number;
  atasozuKonusmaDk: number;
  ses: boolean;
  tema: 'sistem' | 'acik' | 'koyu';
};

export const VARSAYILAN_AYARLAR: Ayarlar = {
  mod: 'arastirma',
  arastirmaDk: 10,
  arastirmaKonusmaDk: 2,
  dogaclamaHazirlikSn: 30,
  dogaclamaKonusmaDk: 1,
  atasozuHazirlikSn: 30,
  atasozuKonusmaDk: 1,
  ses: true,
  tema: 'sistem',
};

export function ayarlariOku(): Ayarlar {
  return { ...VARSAYILAN_AYARLAR, ...oku<Partial<Ayarlar>>('ayarlar', {}) };
}

export function ayarYaz<K extends keyof Ayarlar>(k: K, v: Ayarlar[K]): Ayarlar {
  const a = { ...ayarlariOku(), [k]: v };
  yaz('ayarlar', a);
  return a;
}

// ---- İsteğe bağlı ilerleme (izin gerekir) ----

/** null: henüz sorulmadı; true: tut; false: tutma. İzin kararı bir tercih olarak saklanır. */
export function ilerlemeIzni(): boolean | null {
  return oku<boolean | null>('ilerleme-izni', null);
}

export function ilerlemeIzniYaz(izin: boolean): void {
  yaz('ilerleme-izni', izin);
  if (!izin) ilerlemeyiSil();
}

export function ilerlemeyiSil(): void {
  sil('gecmis');
  sil('ozet');
  sil('rozetler');
}

export function gecmisOku(): Tur[] {
  return ilerlemeIzni() ? oku<Tur[]>('gecmis', []) : [];
}

export function ozetOku(): Ozet {
  return ilerlemeIzni() ? { ...BOS_OZET, ...oku<Partial<Ozet>>('ozet', {}) } : BOS_OZET;
}

export function gecmisYaz(g: Tur[]): void {
  if (ilerlemeIzni()) yaz('gecmis', g.slice(-30));
}

export function ozetYaz(o: Ozet): void {
  if (ilerlemeIzni()) yaz('ozet', o);
}

export function kazanilanRozetler(): string[] {
  return ilerlemeIzni() ? oku<string[]>('rozetler', []) : [];
}

export function rozetleriYaz(r: string[]): void {
  if (ilerlemeIzni()) yaz('rozetler', r);
}
