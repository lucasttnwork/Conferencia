/* eslint-disable no-console */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function assertEnv(name) {
	const v = process.env[name];
	if (!v || !String(v).trim()) {
		throw new Error(`Variável de ambiente ausente: ${name}`);
	}
	return v;
}

const SUPABASE_URL = assertEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY');
const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY');
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN');
const TRELLO_BOARD_ID = assertEnv('TRELLO_BOARD_ID');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false }
});

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
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Falha Trello GET ${url}: ${res.status} ${text}`);
	}
	return res.json();
}

async function fetchActionsLastDays(boardId, days) {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const all = [];
	let before = null;
	const filter = 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard,updateCard';
	while (true) {
		const batch = await trelloGet(`/boards/${boardId}/actions`, {
			limit: 1000,
			filter,
			before
		}).catch(() => []);
		if (!batch || batch.length === 0) break;
		all.push(...batch);
		const last = batch[batch.length - 1];
		const lastDate = last && last.date ? new Date(last.date) : null;
		if (!lastDate || lastDate <= since) break;
		before = last.date;
	}
	return all.filter((a) => {
		try { return new Date(a.date) >= since; } catch { return false; }
	});
}

function chunk(array, size) {
	const out = [];
	for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
	return out;
}

async function countMatches(table, column, ids) {
	if (!Array.isArray(ids) || ids.length === 0) return 0;
	let total = 0;
	for (const part of chunk(ids, 100)) {
		const { data, error } = await supabase
			.from(table)
			.select(`${column}`)
			.in(column, part);
		if (error) throw new Error(`${table}.${column} in(...) falhou: ${error.message}`);
		total += Array.isArray(data) ? data.length : 0;
	}
	return total;
}

async function main() {
	console.log('Verificando sincronização Trello ↔ Supabase...');
	// 1) Cards atuais
	const cards = await trelloGet(`/boards/${TRELLO_BOARD_ID}/cards`, { fields: 'id', limit: 1000 });
	const cardIds = cards.map((c) => c.id);
	const cardsMatched = await countMatches('cards', 'trello_id', cardIds);
	const missingCards = cardIds.length - cardsMatched;

	// 2) Ações últimos 60 dias
	const actions = await fetchActionsLastDays(TRELLO_BOARD_ID, 60);
	const actionIds = Array.from(new Set(actions.map((a) => a.id)));
	const webhookMatched = await countMatches('webhook_events', 'trello_action_id', actionIds);
	const cardEventsMatched = await countMatches('card_events', 'trello_action_id', actionIds);
	const cardIdsFromActions = Array.from(new Set(actions.map((a) => (a.data && a.data.card && a.data.card.id) || null).filter(Boolean)));
	const cardsFromActionsMatched = await countMatches('cards', 'trello_id', cardIdsFromActions);
	const missingWebhook = actionIds.length - webhookMatched;
	const missingCardEvents = actionIds.length - cardEventsMatched;

	console.log('\nResumo:');
	console.log(`- Cards Trello atuais: ${cardIds.length}`);
	console.log(`- Cards presentes em public.cards: ${cardsMatched}`);
	console.log(`- Cards faltantes: ${missingCards}`);
	console.log(`- Ações Trello (60d): ${actionIds.length}`);
	console.log(`- Webhook events gravados: ${webhookMatched} (faltantes: ${missingWebhook})`);
	console.log(`- Card events gravados: ${cardEventsMatched} (faltantes: ${missingCardEvents})`);
	console.log(`- Cards referenciados por ações presentes em public.cards: ${cardsFromActionsMatched}/${cardIdsFromActions.length}`);

	if (missingCards > 0 || missingWebhook > 0 || missingCardEvents > 0 || cardsFromActionsMatched < cardIdsFromActions.length) {
		console.error('\nFalhas de consistência detectadas.');
		process.exit(2);
	}
	console.log('\nConsistência OK: banco reflete 100% dos cards atuais e 100% das ações (60 dias).');
}

main().catch((err) => {
	console.error('Falha na verificação:', err.message);
	process.exit(1);
});


