/* eslint-disable no-console */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function assertEnv(name) {
	const v = process.env[name];
	if (!v || !String(v).trim()) throw new Error(`Variável de ambiente ausente: ${name}`);
	return v;
}

const SUPABASE_URL = assertEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY');
const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY');
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN');
const TRELLO_BOARD_ID = assertEnv('TRELLO_BOARD_ID');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getFetch() {
	if (typeof fetch !== 'undefined') return fetch;
	const mod = await import('node-fetch');
	return mod.default;
}

function trelloUrl(pathname, params = {}) {
	const url = new URL(`https://api.trello.com/1/${pathname.replace(/^\//, '')}`);
	url.searchParams.set('key', TRELLO_API_KEY);
	url.searchParams.set('token', TRELLO_API_TOKEN);
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
	});
	return url.toString();
}

async function trelloGet(pathname, params) {
	const f = await getFetch();
	const url = trelloUrl(pathname, params);
	const res = await f(url);
	if (!res.ok) throw new Error(`Falha Trello GET ${url}: ${res.status}`);
	return res.json();
}

async function rpc(fn, payload) {
	const { error } = await supabase.rpc(fn, payload);
	if (error) throw new Error(`RPC ${fn}: ${error.message}`);
}

function limitConcurrency(limit) {
	let active = 0; const q = [];
	const next = () => { const r = q.shift(); if (r) r(); };
	return async (fn) => { if (active >= limit) await new Promise(r => q.push(r)); active++; try { return await fn(); } finally { active--; next(); } };
}
const runLimited = limitConcurrency(12);

async function processBatch(actions) {
	let ok = 0, fail = 0;
	await Promise.all(actions.map(a => runLimited(async () => {
		try {
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
				await rpc('fn_upsert_card', {
					p_trello_id: card.id,
					p_board_trello_id: (board && board.id) || (card.idBoard || null),
					p_current_list_trello_id: (listAfter && listAfter.id) || (listBefore && listBefore.id) || card.idList || null,
					p_name: card.name || null,
					p_description: null,
					p_url: null,
					p_is_closed: false,
					p_due_at: null
				});
			}

			await rpc('fn_record_webhook_event', { p_board_trello_id: (board && board.id) || null, p_trello_action_id: id, p_action_type: type, p_payload: a });
			await rpc('fn_record_card_event', {
				p_trello_action_id: id,
				p_action_type: type,
				p_card_trello_id: (card && card.id) || null,
				p_board_trello_id: (board && board.id) || null,
				p_list_from_trello_id: (listBefore && listBefore.id) || null,
				p_list_to_trello_id: (listAfter && listAfter.id) || null,
				p_member_trello_id: (member && member.id) || null,
				p_occurred_at: date || null,
				p_payload_json: a
			});

			if (type === 'updateCard' && listAfter && listBefore && card && card.id) {
				await rpc('fn_set_card_list_by_trello', { p_card_trello_id: card.id, p_to_list_trello_id: listAfter.id, p_moved_by_member_trello_id: (member && member.id) || null, p_moved_at: date || null, p_trello_action_id: id });
			}
			ok++;
		} catch (e) {
			fail++;
			if (fail <= 10) console.warn('Falha em ação:', e.message);
		}
	})));
	return { ok, fail };
}

async function main() {
	console.log('Backfill de ações Trello → Supabase (60d)');
	const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
	let before = null; let total = 0; let okTotal = 0; let failTotal = 0; let page = 0;
	const filter = 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard,updateCard';
	while (true) {
		page++;
		const batch = await trelloGet(`/boards/${TRELLO_BOARD_ID}/actions`, { limit: 1000, filter, before }).catch(() => []);
		if (!batch || batch.length === 0) break;
		const last = batch[batch.length - 1]; const lastDate = last && last.date ? new Date(last.date) : null;
		const { ok, fail } = await processBatch(batch);
		okTotal += ok; failTotal += fail; total += batch.length;
		console.log(`Página ${page}: recebidas ${batch.length}, ok ${ok}, falhas ${fail}, total ${total}`);
		if (!lastDate || lastDate <= since) break;
		before = last.date;
	}
	console.log(`Concluído. Ações recebidas: ${total}. Sucesso: ${okTotal}. Falhas: ${failTotal}.`);

	// Reconciliar faltantes (ações e cards atuais)
	console.log('Reconciliação: verificando faltantes...');
	// 1) Ações faltantes
	const actionsAll = await (async () => {
		const out = []; let before = null; const filter = 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard,updateCard';
		const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
		while (true) {
			const batch = await trelloGet(`/boards/${TRELLO_BOARD_ID}/actions`, { limit: 1000, filter, before }).catch(() => []);
			if (!batch || batch.length === 0) break;
			out.push(...batch);
			const last = batch[batch.length - 1]; const lastDate = last && last.date ? new Date(last.date) : null;
			if (!lastDate || lastDate <= since) break;
			before = last.date;
		}
		return out;
	})();
	const actionIdSet = new Set(actionsAll.map(a => a.id));
	const actionIds = Array.from(actionIdSet);
	const chunks = (arr, n) => { const r=[]; for (let i=0;i<arr.length;i+=n) r.push(arr.slice(i,i+n)); return r; };
	const missingActionIds = new Set(actionIds);
	for (const part of chunks(actionIds, 100)) {
		const { data, error } = await supabase.from('webhook_events').select('trello_action_id').in('trello_action_id', part);
		if (error) throw new Error('Verificação webhook_events: ' + error.message);
		for (const row of (data || [])) missingActionIds.delete(row.trello_action_id);
	}
	if (missingActionIds.size > 0) {
		const missingActions = actionsAll.filter(a => missingActionIds.has(a.id));
		console.log(`Ações faltantes detectadas: ${missingActions.length}. Reprocessando...`);
		const { ok: ok2, fail: fail2 } = await processBatch(missingActions);
		console.log(`Reconciliação de ações concluída. Sucesso: ${ok2}. Falhas: ${fail2}.`);
	} else {
		console.log('Nenhuma ação faltante.');
	}

	// 2) Cards atuais faltantes
	const cardsNow = await trelloGet(`/boards/${TRELLO_BOARD_ID}/cards`, { fields: 'id,idBoard,idList,name,desc,url,closed,due', limit: 1000 });
	const cardIds = cardsNow.map(c => c.id);
	const missingCardIds = new Set(cardIds);
	for (const part of chunks(cardIds, 100)) {
		const { data, error } = await supabase.from('cards').select('trello_id').in('trello_id', part);
		if (error) throw new Error('Verificação cards: ' + error.message);
		for (const row of (data || [])) missingCardIds.delete(row.trello_id);
	}
	if (missingCardIds.size > 0) {
		console.log(`Cards atuais faltantes: ${missingCardIds.size}. Inserindo...`);
		for (const c of cardsNow) {
			if (!missingCardIds.has(c.id)) continue;
			await rpc('fn_upsert_card', {
				p_trello_id: c.id,
				p_board_trello_id: c.idBoard,
				p_current_list_trello_id: c.idList || null,
				p_name: c.name || null,
				p_description: c.desc || null,
				p_url: c.url || null,
				p_is_closed: !!c.closed,
				p_due_at: c.due || null
			});
		}
		console.log('Inserção de cards faltantes concluída.');
	} else {
		console.log('Nenhum card atual faltante.');
	}
}

main().catch((e) => { console.error('Erro no backfill:', e.message); process.exit(1); });


