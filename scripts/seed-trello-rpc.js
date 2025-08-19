/* eslint-disable no-console */
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

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

async function rpc(functionName, payload) {
	const { data, error } = await supabase.rpc(functionName, payload);
	if (error) throw new Error(`RPC ${functionName} falhou: ${error.message}`);
	return data;
}

function limitConcurrency(limit) {
	let active = 0;
	const queue = [];
	const next = () => {
		const resolve = queue.shift();
		if (resolve) resolve();
	};
	return async (fn) => {
		if (active >= limit) await new Promise((res) => queue.push(res));
		active++;
		try {
			return await fn();
		} finally {
			active--;
			next();
		}
	};
}

const runLimited = limitConcurrency(8);

async function upsertBaseEntities({ board, lists, labels, members, memberRoleById }) {
	await rpc('fn_upsert_board', { p_trello_id: board.id, p_name: board.name || null, p_url: board.url || null });

	await Promise.all(
		members.map((m) =>
			runLimited(async () => {
				await rpc('fn_upsert_member', {
					p_trello_id: m.id,
					p_username: m.username || null,
					p_full_name: m.fullName || null,
					p_email: null
				});
				const role = memberRoleById.get(m.id) || null;
				await rpc('fn_upsert_board_member', {
					p_board_trello_id: board.id,
					p_member_trello_id: m.id,
					p_role: role
				});
			})
		)
	);

	await Promise.all(
		lists.map((l) =>
			runLimited(() =>
				rpc('fn_upsert_list', {
					p_trello_id: l.id,
					p_board_trello_id: board.id,
					p_name: l.name || null,
					p_pos: l.pos === undefined ? null : Number(l.pos),
					p_closed: !!l.closed
				})
			)
		)
	);

	await Promise.all(
		labels.map((lab) =>
			runLimited(() =>
				rpc('fn_upsert_label', {
					p_trello_id: lab.id,
					p_board_trello_id: board.id,
					p_name: lab.name || null,
					p_color: lab.color || null
				})
			)
		)
	);
}

async function upsertCards(cards, boardId) {
	await Promise.all(
		cards.map((card) =>
			runLimited(async () => {
				await rpc('fn_upsert_card', {
					p_trello_id: card.id,
					p_board_trello_id: card.idBoard || boardId,
					p_current_list_trello_id: card.idList || null,
					p_name: card.name || null,
					p_description: card.desc || null,
					p_url: card.url || null,
					p_is_closed: !!card.closed,
					p_due_at: card.due || null
				});

				let labelIds = [];
				if (Array.isArray(card.idLabels) && card.idLabels.length) labelIds = card.idLabels;
				else if (Array.isArray(card.labels) && card.labels.length) labelIds = card.labels.map((l) => l.id).filter(Boolean);
				if (labelIds.length > 0) {
					await rpc('fn_attach_card_labels', {
						p_card_trello_id: card.id,
						p_label_trello_ids: labelIds
					});
				}

				let memberIds = [];
				if (Array.isArray(card.idMembers) && card.idMembers.length) memberIds = card.idMembers;
				else if (Array.isArray(card.members) && card.members.length) memberIds = card.members.map((m) => m.id).filter(Boolean);
				if (memberIds.length > 0) {
					await rpc('fn_attach_card_members', {
						p_card_trello_id: card.id,
						p_member_trello_ids: memberIds
					});
				}
			})
		)
	);
}

async function processActions(actions, cardsById) {
	await Promise.all(
		actions.map((a) =>
			runLimited(async () => {
				const type = a.type;
				const actionId = a.id;
				const date = a.date;
				const data = a.data || {};
				const card = data.card || {};
				const boardData = data.board || {};
				const listBefore = data.listBefore || data.list || null;
				const listAfter = data.listAfter || null;
				const member = a.member || a.memberCreator || data.member || null;

				if (boardData && boardData.id) {
					await rpc('fn_upsert_board', { p_trello_id: boardData.id, p_name: boardData.name || null, p_url: null });
				}
				if (listBefore && listBefore.id) {
					await rpc('fn_upsert_list', {
						p_trello_id: listBefore.id,
						p_board_trello_id: boardData.id,
						p_name: listBefore.name || null,
						p_pos: null,
						p_closed: false
					});
				}
				if (listAfter && listAfter.id) {
					await rpc('fn_upsert_list', {
						p_trello_id: listAfter.id,
						p_board_trello_id: boardData.id,
						p_name: listAfter.name || null,
						p_pos: null,
						p_closed: false
					});
				}
				if (member && member.id) {
					await rpc('fn_upsert_member', {
						p_trello_id: member.id,
						p_username: member.username || null,
						p_full_name: member.fullName || null,
						p_email: null
					});
					await rpc('fn_upsert_board_member', {
						p_board_trello_id: boardData.id,
						p_member_trello_id: member.id,
						p_role: null
					});
				}
				if (card && card.id) {
					let c = cardsById.get(card.id);
					if (!c) {
						c = {
							id: card.id,
							idBoard: boardData.id,
							idList: (listAfter && listAfter.id) || (listBefore && listBefore.id) || null,
							name: card.name || null,
							desc: null,
							url: null,
							closed: false,
							due: null
						};
					}
					await rpc('fn_upsert_card', {
						p_trello_id: c.id,
						p_board_trello_id: c.idBoard || boardData.id,
						p_current_list_trello_id: c.idList || null,
						p_name: c.name || null,
						p_description: c.desc || null,
						p_url: c.url || null,
						p_is_closed: !!c.closed,
						p_due_at: c.due || null
					});
				}

				await rpc('fn_record_webhook_event', {
					p_board_trello_id: boardData.id || null,
					p_trello_action_id: actionId,
					p_action_type: type,
					p_payload: a
				});
				await rpc('fn_record_card_event', {
					p_trello_action_id: actionId,
					p_action_type: type,
					p_card_trello_id: (card && card.id) || null,
					p_board_trello_id: (boardData && boardData.id) || null,
					p_list_from_trello_id: (listBefore && listBefore.id) || null,
					p_list_to_trello_id: (listAfter && listAfter.id) || null,
					p_member_trello_id: (member && member.id) || null,
					p_occurred_at: date || null,
					p_payload_json: a
				});

				if (type === 'updateCard' && a.data && a.data.listAfter && a.data.listBefore && card && card.id) {
					await rpc('fn_set_card_list_by_trello', {
						p_card_trello_id: card.id,
						p_to_list_trello_id: a.data.listAfter.id,
						p_moved_by_member_trello_id: (member && member.id) || null,
						p_moved_at: date || null,
						p_trello_action_id: actionId
					});
				}
				if (type === 'addMemberToCard' && a.data && a.data.member && card && card.id) {
					await rpc('fn_attach_card_members', {
						p_card_trello_id: card.id,
						p_member_trello_ids: [a.data.member.id]
					});
				}
				if (type === 'addLabelToCard' && a.data && a.data.label && card && card.id) {
					await rpc('fn_upsert_label', {
						p_trello_id: a.data.label.id,
						p_board_trello_id: boardData.id,
						p_name: a.data.label.name || null,
						p_color: a.data.label.color || null
					});
					await rpc('fn_attach_card_labels', {
						p_card_trello_id: card.id,
						p_label_trello_ids: [a.data.label.id]
					});
				}
			})
		)
	);
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
		if (all.length >= 5000) break; // guarda-chuva
	}
	return all.filter((a) => {
		try { return new Date(a.date) >= since; } catch { return false; }
	});
}

async function main() {
	console.log('Seed Trello → Supabase (RPC) iniciando...');
	const [board, lists, labels, members] = await Promise.all([
		trelloGet(`/boards/${TRELLO_BOARD_ID}`, { fields: 'name,url' }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/lists`, { fields: 'name,pos,closed', limit: 1000 }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/labels`, { fields: 'name,color', limit: 1000 }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/members`, { fields: 'username,fullName' })
	]);

	let memberships = [];
	try {
		memberships = await trelloGet(`/boards/${TRELLO_BOARD_ID}/memberships`, { member: 'true' });
	} catch {
		memberships = [];
	}
	const memberRoleById = new Map();
	for (const m of memberships) {
		if (m && m.idMember) memberRoleById.set(m.idMember, m.memberType || null);
	}

	await upsertBaseEntities({ board, lists, labels, members, memberRoleById });

	const cards = await trelloGet(`/boards/${TRELLO_BOARD_ID}/cards`, {
		fields: 'name,desc,url,idList,closed,due,idBoard,idMembers,idLabels',
		members: 'true',
		member_fields: 'id,username,fullName',
		labels: 'true',
		label_fields: 'id,name,color',
		limit: 1000
	});
	const cardsById = new Map(cards.map((c) => [c.id, c]));
	await upsertCards(cards, board.id);

	console.log('Baixando ações (~60 dias)...');
	const actions = await fetchActionsLastDays(TRELLO_BOARD_ID, 60);
	const actionCardIds = Array.from(
		new Set(actions.map((a) => (a && a.data && a.data.card && a.data.card.id ? a.data.card.id : null)).filter(Boolean))
	);
	const missingCardIds = actionCardIds.filter((id) => !cardsById.has(id));
	if (missingCardIds.length) {
		const fetched = await Promise.all(
			missingCardIds.map((id) => trelloGet(`/cards/${id}`, { fields: 'name,desc,url,idList,closed,due,idBoard,idMembers,idLabels' }).catch(() => null))
		);
		for (const c of fetched) if (c && c.id) cardsById.set(c.id, c);
		await upsertCards(fetched.filter(Boolean), board.id);
	}

	console.log(`Processando ${actions.length} ações...`);
	await processActions(actions, cardsById);

	console.log('Seed concluído.');
}

main().catch((err) => {
	console.error('Falha no seed Trello (RPC):', err.message);
	process.exit(1);
});


