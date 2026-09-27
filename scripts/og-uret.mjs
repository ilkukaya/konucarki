// public/og.png üretir (1200×630). Tek seferlik geliştirme aracı; build'in parçası değil.
// Kullanım: node scripts/og-uret.mjs  (playwright yüklü olmalı: npx playwright ya da global kurulum)
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODUL ?? 'playwright');
const kok = fileURLToPath(new URL('..', import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(pathToFileURL(`${kok}scripts/og.html`).href);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: `${kok}public/og.png` });
await b.close();
console.log('✓ public/og.png');
