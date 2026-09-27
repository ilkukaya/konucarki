// İstemci ile build arasında paylaşılan sıkıştırılmış veri biçimleri.
import type { Zorluk } from '../data/schema.ts';

/** /veri/dizin.json: [id, slug, baslik, alan, zorluk] */
export type DizinSatiri = [string, string, string, string, Zorluk];
