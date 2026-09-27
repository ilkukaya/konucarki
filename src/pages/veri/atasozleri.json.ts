import type { APIRoute } from 'astro';
import { atasozleri } from '../../data/index.ts';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(atasozleri), { headers: { 'Content-Type': 'application/json' } });
