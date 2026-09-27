// Build sonrası denetim (postbuild). dist içindeki tüm HTML'lerde CSP'yi bozacak ya da
// üçüncü taraf kaynak yükleyecek her şeyi arar; bulursa listeler ve süreci 1 ile bitirir.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = fileURLToPath(new URL('..', import.meta.url));
const dist = join(kok, 'dist');
const site = new URL(process.env.SITE_URL ?? 'https://konucarki.netlify.app');

function dosyalar(dizin: string): string[] {
  return readdirSync(dizin).flatMap((f) => {
    const y = join(dizin, f);
    return statSync(y).isDirectory() ? dosyalar(y) : [y];
  });
}

const sorunlar: string[] = [];
const htmller = dosyalar(dist).filter((f) => f.endsWith('.html'));

// Kaynak yükleyen öznitelikler: <a href> dışındaki her src/href aynı origin'den olmalı.
// canonical, og:url gibi meta/link'ler kendi sitemize işaret edebilir.
function kendiOriginMi(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('mailto:')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
    try {
      return new URL(url, site).origin === site.origin;
    } catch {
      return false;
    }
  }
  return true; // göreli yol
}

for (const f of htmller) {
  const html = readFileSync(f, 'utf8');
  const ad = relative(dist, f);

  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const oz = m[1];
    if (!/\bsrc\s*=/.test(oz) && !/type\s*=\s*["']?application\/ld\+json/i.test(oz)) sorunlar.push(`${ad}: inline <script> (src yok)`);
  }
  for (const m of html.matchAll(/<[a-z][^>]*\sstyle\s*=/gi)) sorunlar.push(`${ad}: style= özniteliği → ${m[0].slice(0, 80)}`);
  if (/<style\b/i.test(html)) sorunlar.push(`${ad}: inline <style> bloğu`);
  for (const m of html.matchAll(/\son[a-z]+\s*=\s*["']/gi)) sorunlar.push(`${ad}: satır içi olay işleyici ${m[0].trim()}`);

  for (const m of html.matchAll(/<([a-z]+)\b([^>]*?)\s(src|href|srcset|poster|action|data)\s*=\s*["']([^"']*)["']/gi)) {
    const [, etiket, , oz, deger] = m;
    if (deger.startsWith('http://')) sorunlar.push(`${ad}: http:// kaynak → <${etiket} ${oz}="${deger}">`);
    if (etiket.toLowerCase() === 'a') continue; // dış bağlantılar serbest
    if (!kendiOriginMi(deger)) sorunlar.push(`${ad}: dış kaynak → <${etiket} ${oz}="${deger}">`);
  }
  // Dış <a> bağlantıları noopener noreferrer taşımalı.
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["'](https?:[^"']+)["'][^>]*>/gi)) {
    if (kendiOriginMi(m[1])) continue;
    if (!/rel\s*=\s*["'][^"']*noopener[^"']*noreferrer|rel\s*=\s*["'][^"']*noreferrer[^"']*noopener/i.test(m[0])) sorunlar.push(`${ad}: dış bağlantıda rel="noopener noreferrer" yok → ${m[1]}`);
  }
}

// CSS dosyalarında dış kaynak (font, @import) olmamalı.
for (const f of dosyalar(dist).filter((x) => x.endsWith('.css'))) {
  const css = readFileSync(f, 'utf8');
  for (const m of css.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/gi)) if (!kendiOriginMi(m[1])) sorunlar.push(`${relative(dist, f)}: dış url() → ${m[1]}`);
  for (const m of css.matchAll(/@import\s+(?:url\()?["']?(https?:[^"')\s;]+)/gi)) sorunlar.push(`${relative(dist, f)}: dış @import → ${m[1]}`);
}

if (sorunlar.length) {
  console.error(`✗ check-dist: ${sorunlar.length} sorun\n`);
  for (const s of sorunlar) console.error(`  ${s}`);
  process.exit(1);
}
console.log(`✓ check-dist: ${htmller.length} HTML dosyası temiz (inline script/style yok, dış kaynak yok).`);
