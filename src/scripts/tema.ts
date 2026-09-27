import { ayarlariOku, ayarYaz, type Ayarlar } from '../lib/depo.ts';

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function temaUygula(t: Ayarlar['tema']): void {
  const kok = document.documentElement;
  if (t === 'acik') kok.dataset.theme = 'light';
  else if (t === 'koyu') kok.dataset.theme = 'dark';
  else delete kok.dataset.theme;
  const koyu = t === 'koyu' || (t === 'sistem' && mq().matches);
  kok.toggleAttribute('data-koyu', koyu);
  for (const d of document.querySelectorAll<HTMLButtonElement>('[data-tema-dugme]')) {
    d.setAttribute('aria-label', koyu ? 'Açık temaya geç' : 'Koyu temaya geç');
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (meta) meta.content = koyu ? '#0f1a30' : '#f7f9fc';
}

export function tema(): void {
  temaUygula(ayarlariOku().tema);
  mq().addEventListener('change', () => temaUygula(ayarlariOku().tema));
  for (const d of document.querySelectorAll<HTMLButtonElement>('[data-tema-dugme]')) {
    d.addEventListener('click', () => {
      const koyu = document.documentElement.hasAttribute('data-koyu');
      const yeni = koyu ? 'acik' : 'koyu';
      ayarYaz('tema', yeni);
      temaUygula(yeni);
    });
  }
}
