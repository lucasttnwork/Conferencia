import fetch from 'node-fetch';
import { env } from './env';

const TRELLO_BASE = 'https://api.trello.com/1';

export async function trelloGet<T = any>(path: string, params: Record<string,string|number> = {}): Promise<T> {
  const url = new URL(TRELLO_BASE + path);
  url.searchParams.set('key', env.TRELLO_KEY);
  url.searchParams.set('token', env.TRELLO_TOKEN);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Trello GET ${url} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function supabaseUpsert<T = any>(table: string, rows: unknown[], onConflict = 'trello_id'): Promise<T[]> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('on_conflict', onConflict);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates, return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase UPSERT ${table} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T[]>; // retorna linhas upsertadas
}

export async function supabaseSelect<T>(table: string, query: string) {
  // query no formato "select=...&filtro=..."
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  for (const pair of query.split('&')) {
    const [k,v] = pair.split('=');
    if (k) url.searchParams.set(k, decodeURIComponent(v ?? ''));
  }
  const res = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase SELECT ${table} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
} 