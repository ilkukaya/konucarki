import type { APIRoute, GetStaticPaths } from 'astro';
import { alanlar, konular } from '../../../data/index.ts';

export const getStaticPaths: GetStaticPaths = () => alanlar.map((a) => ({ params: { alan: a.id } }));

export const GET: APIRoute = ({ params }) => {
  const parca = konular.filter((k) => k.alan === params.alan);
  return new Response(JSON.stringify(parca), { headers: { 'Content-Type': 'application/json' } });
};
