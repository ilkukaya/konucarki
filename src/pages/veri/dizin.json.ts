import type { APIRoute } from 'astro';
import { konular } from '../../data/index.ts';
import type { DizinSatiri } from '../../lib/veri-tipleri.ts';

export const GET: APIRoute = () => {
  const satirlar: DizinSatiri[] = konular.map((k) => [k.id, k.slug, k.baslik, k.alan, k.zorluk]);
  return new Response(JSON.stringify(satirlar), { headers: { 'Content-Type': 'application/json' } });
};
