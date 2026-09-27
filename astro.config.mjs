// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://konucarki.netlify.app';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never', format: 'directory' },
  vite: { build: { assetsInlineLimit: 0 } },
  prefetch: false,
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/ayarlar/') && !page.includes('/veri/'),
    }),
  ],
});
