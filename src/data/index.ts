// Build zamanında tüm kütüphaneyi toplar. Yalnızca sayfalar ve build scriptleri içindir;
// istemci tarafı bundle'a girmemeli (ana sayfa verileri /veri/*.json'dan fetch eder).
import alanlarJson from './alanlar.json';
import kategorilerJson from './dogaclama-kategoriler.json';
import sorularJson from './dogaclama-sorular.json';
import atasozleriJson from './atasozleri.json';
import meydanJson from './meydan-okumalar.json';
import type { Alan, ArastirmaKonusu, AtasozuDeyim, DogaclamaKategori, DogaclamaSorusu, MeydanOkuma } from './schema.ts';

const konuModulleri = import.meta.glob<{ default: ArastirmaKonusu[] }>('./konular/*.json', { eager: true });

export const alanlar = alanlarJson as Alan[];
export const kategoriler = kategorilerJson as DogaclamaKategori[];
export const dogaclamaSorulari = sorularJson as DogaclamaSorusu[];
export const atasozleri = atasozleriJson as AtasozuDeyim[];
export const meydanOkumalari = meydanJson as MeydanOkuma[];

export const konular: ArastirmaKonusu[] = alanlar.flatMap((a) => {
  const mod = konuModulleri[`./konular/${a.id}.json`];
  return mod ? [...mod.default].sort((x, y) => x.id.localeCompare(y.id)) : [];
});

export const alanById = new Map(alanlar.map((a) => [a.id, a]));
export const konuBySlug = new Map(konular.map((k) => [k.slug, k]));
export const kategoriById = new Map(kategoriler.map((k) => [k.id, k]));
