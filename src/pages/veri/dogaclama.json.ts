import type { APIRoute } from 'astro';
import { dogaclamaSorulari } from '../../data/index.ts';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(dogaclamaSorulari), { headers: { 'Content-Type': 'application/json' } });
