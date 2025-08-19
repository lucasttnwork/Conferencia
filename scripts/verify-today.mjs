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

function chunk(array, size) {
	const out = [];
	for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
	return out;
}

async function countMatches(table, column, ids) {
	if (!Array.isArray(ids) || ids.length === 0) return 0;
	let total = 0;
	for (const part of chunk(ids, 100)) {
		const { data, error } = await supabase.from(table).select(`${column}`).in(column, part);
		if (error) throw new Error(`${table}.${column}: ${error.message}`);
		total += Array.isArray(data) ? data.length : 0;
	}
	return total;
}

async function fetchActionsToday(boardId) {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const sinceISO = start.toISOString();
	let before = null;
	const filter = 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard,updateCard';
	const all = [];
	while (true) {
		const batch = await trelloGet(`/boards/${boardId}/actions`, { limit: 1000, filter, before }).catch(() => []);
		if (!batch || batch.length === 0) break;
		const inDay = batch.filter((a) => {
			try { return new Date(a.date) >= start; } catch { return false; }
		});
		all.push(...inDay);
		const last = batch[batch.length - 1];
		const lastDate = last && last.date ? new Date(last.date) : null;
		if (!lastDate || lastDate < start) break;
		before = last.date;
	}
	return all;
}

async function main() {
	console.log('Verificando ações e movimentações de HOJE...');
	const actions = await fetchActionsToday(TRELLO_BOARD_ID);
	const actionIds = Array.from(new Set(actions.map((a) => a.id)));
	const moveActionIds = Array.from(new Set(actions.filter((a) => a.type === 'updateCard' && a.data && a.data.listAfter && a.data.listBefore).map((a) => a.id)));
	const createCardIds = Array.from(new Set(actions.filter((a) => a.type === 'createCard' && a.data && a.data.card && a.data.card.id).map((a) => a.data.card.id)));

	const webhookMatched = await countMatches('webhook_events', 'trello_action_id', actionIds);
	const cardEventsMatched = await countMatches('card_events', 'trello_action_id', actionIds);
	const movementsMatched = await countMatches('card_movements', 'trello_action_id', moveActionIds);
	const createdCardsPresent = await countMatches('cards', 'trello_id', createCardIds);

	const missingWebhook = actionIds.length - webhookMatched;
	const missingCardEvents = actionIds.length - cardEventsMatched;
	const missingMovements = moveActionIds.length - movementsMatched;
	const missingCreatedCards = createCardIds.length - createdCardsPresent;

	console.log('\nHoje:');
	console.log(`- Ações Trello hoje: ${actionIds.length}`);
	console.log(`- Webhook events gravados: ${webhookMatched} (faltantes: ${missingWebhook})`);
	console.log(`- Card events gravados: ${cardEventsMatched} (faltantes: ${missingCardEvents})`);
	console.log(`- Movimentos (updateCard:idList) gravados: ${movementsMatched}/${moveActionIds.length} (faltantes: ${missingMovements})`);
	console.log(`- Cards criados hoje presentes em public.cards: ${createdCardsPresent}/${createCardIds.length} (faltantes: ${missingCreatedCards})`);

	if (missingWebhook > 0 || missingCardEvents > 0 || missingMovements > 0 || missingCreatedCards > 0) {
		console.error('\nInconsistências detectadas para HOJE.');
		process.exit(2);
	}
	console.log('\nOK: dados de HOJE estão completos.');
}

main().catch((e) => { console.error('Falha na verificação de hoje:', e.message); process.exit(1); });


