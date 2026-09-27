// Konu verilerini aynı origin'den, ihtiyaç anında yükler ve bellekte tutar.
import type { ArastirmaKonusu, AtasozuDeyim, DogaclamaSorusu } from '../data/schema.ts';
import type { DizinSatiri } from '../lib/veri-tipleri.ts';

const onbellek = new Map<string, Promise<unknown>>();

function getir<T>(yol: string): Promise<T> {
  let p = onbellek.get(yol) as Promise<T> | undefined;
  if (!p) {
    p = fetch(yol, { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`${yol}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => onbellek.delete(yol));
    onbellek.set(yol, p);
  }
  return p;
}

export const dizin = () => getir<DizinSatiri[]>('/veri/dizin.json');
export const alanKonulari = (alan: string) => getir<ArastirmaKonusu[]>(`/veri/arastirma/${alan}.json`);
export const dogaclamaSorulari = () => getir<DogaclamaSorusu[]>('/veri/dogaclama.json');
export const atasozleri = () => getir<AtasozuDeyim[]>('/veri/atasozleri.json');

export async function konuGetir(slug: string): Promise<ArastirmaKonusu | undefined> {
  const satir = (await dizin()).find((s) => s[1] === slug);
  if (!satir) return undefined;
  return (await alanKonulari(satir[3])).find((k) => k.slug === slug);
}
