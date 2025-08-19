/* eslint-disable no-console */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function assertEnv(name) { const v = process.env[name]; if (!v || !String(v).trim()) throw new Error(`Variável de ambiente ausente: ${name}`); return v; }

const SUPABASE_URL = assertEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY');
const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY');
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN');
const TRELLO_BOARD_ID = assertEnv('TRELLO_BOARD_ID');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getFetch() { if (typeof fetch !== 'undefined') return fetch; const mod = await import('node-fetch'); return mod.default; }
function trelloUrl(pathname, params = {}) { const url = new URL(`https://api.trello.com/1/${pathname.replace(/^\//, '')}`); url.searchParams.set('key', TRELLO_API_KEY); url.searchParams.set('token', TRELLO_API_TOKEN); Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); }); return url.toString(); }
async function trelloGet(pathname, params) { const f = await getFetch(); const url = trelloUrl(pathname, params); const res = await f(url); if (!res.ok) throw new Error(`Falha Trello GET ${url}: ${res.status}`); return res.json(); }

async function rpc(fn, payload) { const { error } = await supabase.rpc(fn, payload); if (error) throw new Error(`RPC ${fn}: ${error.message}`); }

function limitConcurrency(limit) { let active = 0; const q=[]; const next=()=>{ const r=q.shift(); if(r) r();}; return async(fn)=>{ if(active>=limit) await new Promise(r=>q.push(r)); active++; try{ return await fn(); } finally{ active--; next(); } }; }
const runLimited = limitConcurrency(12);

async function processBatch(actions) {
  await Promise.all(actions.map(a => runLimited(async () => {
    const type = a.type; const id = a.id; const date = a.date;
    const data = a.data || {}; const card = data.card || {}; const board = data.board || {};
    const listBefore = data.listBefore || data.list || null; const listAfter = data.listAfter || null;
    const member = a.member || a.memberCreator || data.member || null;

    if (board && board.id) await rpc('fn_upsert_board', { p_trello_id: board.id, p_name: board.name || null, p_url: null });
    if (listBefore && listBefore.id) await rpc('fn_upsert_list', { p_trello_id: listBefore.id, p_board_trello_id: board.id, p_name: listBefore.name || null, p_pos: null, p_closed: false });
    if (listAfter && listAfter.id) await rpc('fn_upsert_list', { p_trello_id: listAfter.id, p_board_trello_id: board.id, p_name: listAfter.name || null, p_pos: null, p_closed: false });
    if (member && member.id) {
      await rpc('fn_upsert_member', { p_trello_id: member.id, p_username: member.username || null, p_full_name: member.fullName || null, p_email: null });
      if (board && board.id) await rpc('fn_upsert_board_member', { p_board_trello_id: board.id, p_member_trello_id: member.id, p_role: null });
    }
    if (card && card.id) {
      await rpc('fn_upsert_card', { p_trello_id: card.id, p_board_trello_id: (board && board.id) || (card.idBoard || null), p_current_list_trello_id: (listAfter && listAfter.id) || (listBefore && listBefore.id) || card.idList || null, p_name: card.name || null, p_description: null, p_url: null, p_is_closed: false, p_due_at: null });
    }

    await rpc('fn_record_webhook_event', { p_board_trello_id: (board && board.id) || null, p_trello_action_id: id, p_action_type: type, p_payload: a });
    await rpc('fn_record_card_event', { p_trello_action_id: id, p_action_type: type, p_card_trello_id: (card && card.id) || null, p_board_trello_id: (board && board.id) || null, p_list_from_trello_id: (listBefore && listBefore.id) || null, p_list_to_trello_id: (listAfter && listAfter.id) || null, p_member_trello_id: (member && member.id) || null, p_occurred_at: date || null, p_payload_json: a });

    if (type === 'updateCard' && listAfter && listBefore && card && card.id) {
      await rpc('fn_set_card_list_by_trello', { p_card_trello_id: card.id, p_to_list_trello_id: listAfter.id, p_moved_by_member_trello_id: (member && member.id) || null, p_moved_at: date || null, p_trello_action_id: id });
    }
  })));
}

async function fetchActionsToday(boardId) {
  const start = new Date(); start.setHours(0,0,0,0);
  let before = null; const filter = 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard,updateCard';
  const all = [];
  while (true) {
    const batch = await trelloGet(`/boards/${boardId}/actions`, { limit: 1000, filter, before }).catch(() => []);
    if (!batch || batch.length === 0) break;
    const inDay = batch.filter((a) => { try { return new Date(a.date) >= start; } catch { return false; } });
    all.push(...inDay);
    const last = batch[batch.length - 1]; const lastDate = last && last.date ? new Date(last.date) : null;
    if (!lastDate || lastDate < start) break;
    before = last.date;
  }
  return all;
}

async function main() {
  console.log('Backfill pontual de HOJE...');
  const actions = await fetchActionsToday(TRELLO_BOARD_ID);
  // Descobrir faltantes em webhook_events
  const ids = Array.from(new Set(actions.map(a => a.id)));
  const chunks = (arr,n)=>{const r=[];for(let i=0;i<arr.length;i+=n)r.push(arr.slice(i,i+n));return r;};
  const missing = new Set(ids);
  for (const part of chunks(ids, 100)) {
    const { data, error } = await supabase.from('webhook_events').select('trello_action_id').in('trello_action_id', part);
    if (error) throw new Error('Consulta webhook_events: ' + error.message);
    for (const row of (data || [])) missing.delete(row.trello_action_id);
  }
  const missingActions = actions.filter(a => missing.has(a.id));
  console.log(`Ações de hoje: ${ids.length}. Faltantes para inserir: ${missingActions.length}.`);
  await processBatch(missingActions);
  console.log('Backfill de hoje concluído.');
}

main().catch(e => { console.error('Erro no backfill de hoje:', e.message); process.exit(1); });


