// Konu kütüphanesinin tipleri ve elle yazılmış doğrulama kuralları.
// Hem build (scripts/validate-content.ts) hem sayfalar bu dosyayı kullanır.

export type Zorluk = 1 | 2 | 3;

export type Alan = { id: string; ad: string; kisaAd: string; aciklama: string };

export type ArastirmaKonusu = {
  id: string; // "ar-001"
  slug: string; // "simpson-paradoksu"
  baslik: string;
  alan: string; // Alan.id
  zorluk: Zorluk;
  ipucu: string; // 2–3 cümle
  sorular: string[]; // 3–4 soru
  arama: string; // 2–5 kelime
  ilgili: string[]; // 2–4 slug
};

export type DogaclamaKategori = { id: string; ad: string; kisaAd: string; aciklama: string };
export type DogaclamaSorusu = { id: string; kategori: string; soru: string };

export type AtasozuTur = 'atasözü' | 'deyim';
export type AtasozuDeyim = { id: string; metin: string; tur: AtasozuTur; anlam: string };

export const HEDEF = {
  alanSayisi: 10,
  alanBasinaKonu: 12,
  kategoriSayisi: 10,
  kategoriBasinaSoru: 20,
  atasozuSayisi: 60,
} as const;

export const SINIR = {
  baslikMax: 70,
  ipucuMin: 120,
  ipucuMax: 400,
  arastirmaSorusuMax: 160,
  dogaclamaSorusuMax: 140,
  anlamMax: 300,
} as const;

export const ZORLUK_ADI: Record<Zorluk, string> = { 1: 'Kolay', 2: 'Orta', 3: 'Zor' };

export type Hata = { dosya: string; mesaj: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function tekil<T>(liste: T[], anahtar: (x: T) => string, dosya: string, ad: string): Hata[] {
  const gorulen = new Set<string>();
  const hatalar: Hata[] = [];
  for (const x of liste) {
    const k = anahtar(x);
    if (gorulen.has(k)) hatalar.push({ dosya, mesaj: `Yinelenen ${ad}: ${k}` });
    gorulen.add(k);
  }
  return hatalar;
}

function kelimeSayisi(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function alanlariDogrula(alanlar: Alan[], dosya = 'alanlar.json'): Hata[] {
  const h: Hata[] = [];
  if (alanlar.length !== HEDEF.alanSayisi)
    h.push({ dosya, mesaj: `${HEDEF.alanSayisi} alan bekleniyordu, ${alanlar.length} var` });
  for (const a of alanlar) {
    if (!SLUG_RE.test(a.id)) h.push({ dosya, mesaj: `Geçersiz alan id: ${a.id}` });
    if (!a.ad || !a.kisaAd || !a.aciklama) h.push({ dosya, mesaj: `Eksik alan bilgisi: ${a.id}` });
    if (a.kisaAd.length > 12) h.push({ dosya, mesaj: `kisaAd çark için uzun (≤12): ${a.kisaAd}` });
  }
  return h.concat(tekil(alanlar, (a) => a.id, dosya, 'alan id'));
}

export function konulariDogrula(konular: ArastirmaKonusu[], alanlar: Alan[], dosyaOf: (k: ArastirmaKonusu) => string): Hata[] {
  const h: Hata[] = [];
  const alanIdleri = new Set(alanlar.map((a) => a.id));
  const sluglar = new Set(konular.map((k) => k.slug));

  for (const k of konular) {
    const d = dosyaOf(k);
    const e = (m: string) => h.push({ dosya: d, mesaj: `${k.id} (${k.slug}): ${m}` });
    if (!/^ar-\d{3}$/.test(k.id)) e('id biçimi "ar-000" olmalı');
    if (!SLUG_RE.test(k.slug)) e('slug yalnızca a-z0-9- içerebilir');
    if (!alanIdleri.has(k.alan)) e(`bilinmeyen alan "${k.alan}"`);
    if (![1, 2, 3].includes(k.zorluk)) e('zorluk 1, 2 veya 3 olmalı');
    if (!k.baslik || k.baslik.length > SINIR.baslikMax) e(`baslik 1–${SINIR.baslikMax} karakter olmalı (${k.baslik?.length})`);
    if (k.ipucu.length < SINIR.ipucuMin || k.ipucu.length > SINIR.ipucuMax)
      e(`ipucu ${SINIR.ipucuMin}–${SINIR.ipucuMax} karakter olmalı (${k.ipucu.length})`);
    if (k.sorular.length < 3 || k.sorular.length > 4) e(`3–4 soru olmalı (${k.sorular.length})`);
    for (const s of k.sorular) if (s.length > SINIR.arastirmaSorusuMax) e(`soru ${SINIR.arastirmaSorusuMax} karakteri aşıyor: "${s}"`);
    const ks = kelimeSayisi(k.arama);
    if (ks < 2 || ks > 5) e(`arama 2–5 kelime olmalı (${ks})`);
    if (k.ilgili.length < 2 || k.ilgili.length > 4) e(`2–4 ilgili konu olmalı (${k.ilgili.length})`);
    for (const s of k.ilgili) {
      if (!sluglar.has(s)) e(`ilgili slug bulunamadı: ${s}`);
      if (s === k.slug) e('konu kendisiyle ilgili gösterilemez');
    }
  }

  h.push(...tekil(konular, (k) => k.id, 'konular', 'konu id'));
  h.push(...tekil(konular, (k) => k.slug, 'konular', 'slug'));

  for (const a of alanlar) {
    const n = konular.filter((k) => k.alan === a.id).length;
    if (n !== HEDEF.alanBasinaKonu) h.push({ dosya: `konular/${a.id}.json`, mesaj: `${a.id}: ${HEDEF.alanBasinaKonu} konu bekleniyordu, ${n} var` });
  }
  return h;
}

export function dogaclamaDogrula(kategoriler: DogaclamaKategori[], sorular: DogaclamaSorusu[], dosya = 'dogaclama-sorular.json'): Hata[] {
  const h: Hata[] = [];
  if (kategoriler.length !== HEDEF.kategoriSayisi)
    h.push({ dosya: 'dogaclama-kategoriler.json', mesaj: `${HEDEF.kategoriSayisi} kategori bekleniyordu, ${kategoriler.length} var` });
  for (const k of kategoriler) {
    if (!SLUG_RE.test(k.id)) h.push({ dosya: 'dogaclama-kategoriler.json', mesaj: `Geçersiz kategori id: ${k.id}` });
    if (k.kisaAd.length > 12) h.push({ dosya: 'dogaclama-kategoriler.json', mesaj: `kisaAd çark için uzun (≤12): ${k.kisaAd}` });
  }
  h.push(...tekil(kategoriler, (k) => k.id, 'dogaclama-kategoriler.json', 'kategori id'));
  const ids = new Set(kategoriler.map((k) => k.id));
  for (const s of sorular) {
    if (!/^dg-\d{3}$/.test(s.id)) h.push({ dosya, mesaj: `${s.id}: id biçimi "dg-000" olmalı` });
    if (!ids.has(s.kategori)) h.push({ dosya, mesaj: `${s.id}: bilinmeyen kategori "${s.kategori}"` });
    if (!s.soru || s.soru.length > SINIR.dogaclamaSorusuMax) h.push({ dosya, mesaj: `${s.id}: soru 1–${SINIR.dogaclamaSorusuMax} karakter olmalı (${s.soru.length})` });
  }
  h.push(...tekil(sorular, (s) => s.id, dosya, 'soru id'));
  h.push(...tekil(sorular, (s) => s.soru.toLocaleLowerCase('tr'), dosya, 'soru metni'));
  for (const k of kategoriler) {
    const n = sorular.filter((s) => s.kategori === k.id).length;
    if (n !== HEDEF.kategoriBasinaSoru) h.push({ dosya, mesaj: `${k.id}: ${HEDEF.kategoriBasinaSoru} soru bekleniyordu, ${n} var` });
  }
  return h;
}

export function atasozleriniDogrula(liste: AtasozuDeyim[], dosya = 'atasozleri.json'): Hata[] {
  const h: Hata[] = [];
  if (liste.length !== HEDEF.atasozuSayisi) h.push({ dosya, mesaj: `${HEDEF.atasozuSayisi} kayıt bekleniyordu, ${liste.length} var` });
  for (const a of liste) {
    if (!/^as-\d{3}$/.test(a.id)) h.push({ dosya, mesaj: `${a.id}: id biçimi "as-000" olmalı` });
    if (a.tur !== 'atasözü' && a.tur !== 'deyim') h.push({ dosya, mesaj: `${a.id}: tur "atasözü" ya da "deyim" olmalı` });
    if (!a.metin) h.push({ dosya, mesaj: `${a.id}: metin boş` });
    if (!a.anlam || a.anlam.length > SINIR.anlamMax) h.push({ dosya, mesaj: `${a.id}: anlam 1–${SINIR.anlamMax} karakter olmalı` });
  }
  h.push(...tekil(liste, (a) => a.id, dosya, 'id'));
  h.push(...tekil(liste, (a) => a.metin.toLocaleLowerCase('tr'), dosya, 'metin'));
  return h;
}
