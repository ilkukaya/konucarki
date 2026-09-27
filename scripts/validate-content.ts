// İçerik doğrulama: `npm run validate` (build'den önce otomatik çalışır).
// Başarısızsa süreç 1 ile çıkar ve build durur. Ayrıca scripts/content-report.md üretir.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alanlariDogrula,
  atasozleriniDogrula,
  dogaclamaDogrula,
  konulariDogrula,
  meydanOkumalariDogrula,
  type MeydanOkuma,
  ZORLUK_ADI,
  type Alan,
  type ArastirmaKonusu,
  type AtasozuDeyim,
  type DogaclamaKategori,
  type DogaclamaSorusu,
  type Hata,
} from '../src/data/schema.ts';
import { slugify } from '../src/lib/slugify.ts';
import { terimleriAyristir, yasakliBul } from '../src/lib/yasakli.ts';

const kok = fileURLToPath(new URL('..', import.meta.url));
const veri = join(kok, 'src/data');

function oku<T>(yol: string): T {
  try {
    return JSON.parse(readFileSync(yol, 'utf8')) as T;
  } catch (e) {
    console.error(`✗ ${relative(kok, yol)} okunamadı: ${(e as Error).message}`);
    process.exit(1);
  }
}

const hatalar: Hata[] = [];
const alanlar = oku<Alan[]>(join(veri, 'alanlar.json'));
hatalar.push(...alanlariDogrula(alanlar));

const konuDosyasi = new Map<string, string>();
const konular: ArastirmaKonusu[] = [];
const konuKlasoru = join(veri, 'konular');
for (const a of alanlar) {
  const yol = join(konuKlasoru, `${a.id}.json`);
  if (!existsSync(yol)) {
    hatalar.push({ dosya: `konular/${a.id}.json`, mesaj: 'dosya yok' });
    continue;
  }
  for (const k of oku<ArastirmaKonusu[]>(yol)) {
    konular.push(k);
    konuDosyasi.set(k.id, `konular/${a.id}.json`);
    if (k.alan !== a.id) hatalar.push({ dosya: `konular/${a.id}.json`, mesaj: `${k.id}: alan "${k.alan}" dosya adıyla uyuşmuyor` });
  }
}
for (const f of readdirSync(konuKlasoru)) {
  if (!alanlar.some((a) => `${a.id}.json` === f)) hatalar.push({ dosya: `konular/${f}`, mesaj: 'tanımsız alana ait dosya' });
}
hatalar.push(...konulariDogrula(konular, alanlar, (k) => konuDosyasi.get(k.id) ?? 'konular'));

// Slug, başlığın Türkçe dönüşümlü haliyle ASCII kurala uymalı; başlıktan türetilmesi beklenir ama kısaltılabilir.
for (const k of konular) {
  if (k.slug !== slugify(k.slug)) hatalar.push({ dosya: konuDosyasi.get(k.id)!, mesaj: `${k.id}: slug normalleştirilmemiş` });
}

const kategoriler = oku<DogaclamaKategori[]>(join(veri, 'dogaclama-kategoriler.json'));
const sorular = oku<DogaclamaSorusu[]>(join(veri, 'dogaclama-sorular.json'));
hatalar.push(...dogaclamaDogrula(kategoriler, sorular));

const atasozleri = oku<AtasozuDeyim[]>(join(veri, 'atasozleri.json'));
hatalar.push(...atasozleriniDogrula(atasozleri));

const meydanlar = oku<MeydanOkuma[]>(join(veri, 'meydan-okumalar.json'));
hatalar.push(...meydanOkumalariDogrula(meydanlar));

// Yasaklı terim taraması: her veri dosyasını satır satır tara.
const terimler = terimleriAyristir(readFileSync(join(kok, 'scripts/banned-terms.txt'), 'utf8'));
const taranacak = [
  'alanlar.json',
  'dogaclama-kategoriler.json',
  'dogaclama-sorular.json',
  'atasozleri.json',
  'meydan-okumalar.json',
  ...readdirSync(konuKlasoru).map((f) => `konular/${f}`),
];
for (const dosya of taranacak) {
  const satirlar = readFileSync(join(veri, dosya), 'utf8').split('\n');
  satirlar.forEach((satir, i) => {
    // Yalnızca değerleri tara, JSON anahtarlarını değil.
    const degerler = [...satir.matchAll(/:\s*"((?:[^"\\]|\\.)*)"|^\s*"((?:[^"\\]|\\.)*)",?\s*$/g)].map((m) => m[1] ?? m[2]);
    for (const d of degerler) {
      for (const t of yasakliBul(d, terimler)) hatalar.push({ dosya: `${dosya}:${i + 1}`, mesaj: `yasaklı terim "${t}" → ${satir.trim()}` });
    }
  });
}

// İnceleme raporu
const rapor: string[] = [
  '# İçerik inceleme raporu',
  '',
  `Otomatik üretildi (\`npm run validate\`). ${konular.length} araştırma konusu, ${sorular.length} doğaçlama sorusu, ${atasozleri.length} atasözü/deyim.`,
  '',
];
for (const a of alanlar) {
  rapor.push(`## ${a.ad}`, '');
  for (const k of konular.filter((x) => x.alan === a.id)) {
    rapor.push(`- **${k.baslik}** (${ZORLUK_ADI[k.zorluk]}, \`${k.slug}\`) — ${k.ipucu}`);
  }
  rapor.push('');
}
rapor.push('## Doğaçlama soruları', '');
for (const kat of kategoriler) {
  rapor.push(`### ${kat.ad}`, '');
  for (const s of sorular.filter((x) => x.kategori === kat.id)) rapor.push(`- ${s.soru}`);
  rapor.push('');
}
rapor.push('## Atasözleri ve deyimler', '');
for (const a of atasozleri) rapor.push(`- **${a.metin}** (${a.tur}) — ${a.anlam}`);
rapor.push('', '## Meydan okuma kartları', '');
for (const m of meydanlar) rapor.push(`- ${m.metin}`);
rapor.push('');
writeFileSync(join(kok, 'scripts/content-report.md'), rapor.join('\n'));

if (hatalar.length) {
  console.error(`✗ İçerik doğrulaması başarısız: ${hatalar.length} hata\n`);
  for (const h of hatalar) console.error(`  ${h.dosya}  ${h.mesaj}`);
  process.exit(1);
}
console.log(
  `✓ İçerik geçerli: ${alanlar.length} alan, ${konular.length} konu, ${kategoriler.length} kategori, ${sorular.length} soru, ${atasozleri.length} atasözü/deyim. Rapor: scripts/content-report.md`,
);
