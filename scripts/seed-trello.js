/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const CONTAINER = 'conferencia_db';
const DB = 'conferencia';

function assertEnv(name) {
	const v = process.env[name];
	if (!v || !String(v).trim()) {
		throw new Error(`Variável de ambiente ausente: ${name}`);
	}
	return v;
}

const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY');
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN');
const TRELLO_BOARD_ID = assertEnv('TRELLO_BOARD_ID');

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

function sqlLit(value) {
	if (value === null || value === undefined) return 'NULL';
	// Convert booleans and numbers directly
	if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
	if (typeof value === 'number') return String(value);
	// Timestamps: keep as string literal
	const s = String(value).replace(/'/g, "''");
	return `'${s}'`;
}

function runCmd(cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
			if (err) {
				reject(new Error(`${err.message}\nSTDOUT:${stdout}\nSTDERR:${stderr}`));
				return;
			}
			resolve({ stdout, stderr });
		});
	});
}

async function applySqlBatch(sqlLines, tag) {
	const tmpLocal = path.join(__dirname, `tmp_seed_${tag}.sql`);
	fs.writeFileSync(tmpLocal, sqlLines.join('\n'), 'utf8');
	const tmpRemote = `/tmp/${path.basename(tmpLocal)}`;
	await runCmd(`docker cp "${tmpLocal}" ${CONTAINER}:${tmpRemote}`);
	await runCmd(`docker exec ${CONTAINER} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -f ${tmpRemote}`);
	console.log(`SQL aplicado com sucesso: ${tag}`);
}

async function main() {
	console.log('Buscando dados do Trello...');
	const [board, lists, labels, members] = await Promise.all([
		trelloGet(`/boards/${TRELLO_BOARD_ID}`, { fields: 'name,url' }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/lists`, { fields: 'name,pos,closed', limit: 1000 }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/labels`, { fields: 'name,color', limit: 1000 }),
		trelloGet(`/boards/${TRELLO_BOARD_ID}/members`, { fields: 'username,fullName' }),
	]);

	// Board memberships para roles (opcional)
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

	// Pegar ao menos 10 cards com labels e membros e ids
	const cards = await trelloGet(`/boards/${TRELLO_BOARD_ID}/cards`, {
		fields: 'name,desc,url,idList,closed,due,idBoard,idMembers,idLabels',
		members: 'true',
		member_fields: 'id,username,fullName',
		labels: 'true',
		label_fields: 'id,name,color',
		limit: 200,
	});
	const cardsSample = cards.slice(0, Math.max(10, Math.min(cards.length, 25)));
	const cardsById = new Map(cards.map((c) => [c.id, c]));

	// Montar lote de upserts em transação
	const lines = [];
	lines.push('BEGIN;');
	// Board
	lines.push(
		`SELECT public.fn_upsert_board(${sqlLit(board.id)}, ${sqlLit(board.name)}, ${sqlLit(board.url)});`
	);
	// Members + board_members
	for (const mem of members) {
		lines.push(
			`SELECT public.fn_upsert_member(${sqlLit(mem.id)}, ${sqlLit(mem.username)}, ${sqlLit(mem.fullName)}, NULL);`
		);
		const role = memberRoleById.get(mem.id) || null;
		lines.push(
			`SELECT public.fn_upsert_board_member(${sqlLit(board.id)}, ${sqlLit(mem.id)}, ${sqlLit(role)});`
		);
	}
	// Lists
	for (const list of lists) {
		lines.push(
			`SELECT public.fn_upsert_list(${sqlLit(list.id)}, ${sqlLit(board.id)}, ${sqlLit(list.name)}, ${sqlLit(list.pos)}, ${sqlLit(!!list.closed)});`
		);
	}
	// Labels
	for (const lab of labels) {
		lines.push(
			`SELECT public.fn_upsert_label(${sqlLit(lab.id)}, ${sqlLit(board.id)}, ${sqlLit(lab.name)}, ${sqlLit(lab.color)});`
		);
	}
	// Cards (amostra)
	for (const card of cardsSample) {
		lines.push(
			`SELECT public.fn_upsert_card(${sqlLit(card.id)}, ${sqlLit(board.id)}, ${sqlLit(card.idList)}, ${sqlLit(card.name)}, ${sqlLit(card.desc)}, ${sqlLit(card.url)}, ${sqlLit(!!card.closed)}, ${sqlLit(card.due)});`
		);
		// attach labels
		let labelIds = [];
		if (Array.isArray(card.idLabels) && card.idLabels.length) labelIds = card.idLabels;
		else if (Array.isArray(card.labels) && card.labels.length) labelIds = card.labels.map((l) => l.id).filter(Boolean);
		if (labelIds.length > 0) {
			lines.push(
				`SELECT public.fn_attach_card_labels(${sqlLit(card.id)}, ARRAY[${labelIds.map(sqlLit).join(',')}]);`
			);
		}
		// attach members
		let memberIds = [];
		if (Array.isArray(card.idMembers) && card.idMembers.length) memberIds = card.idMembers;
		else if (Array.isArray(card.members) && card.members.length) memberIds = card.members.map((m) => m.id).filter(Boolean);
		if (memberIds.length > 0) {
			lines.push(
				`SELECT public.fn_attach_card_members(${sqlLit(card.id)}, ARRAY[${memberIds.map(sqlLit).join(',')}]);`
			);
		}
	}
	lines.push('COMMIT;');
	await applySqlBatch(lines, 'trello_seed');

	// Ingerir últimas ações para popular movimentos e eventos
	let actions = [];
	try {
		actions = await trelloGet(`/boards/${TRELLO_BOARD_ID}/actions`, {
			limit: 50,
			filter: 'updateCard:idList,createCard,addMemberToCard,removeMemberFromCard,addLabelToCard,removeLabelFromCard',
		});
	} catch {
		actions = [];
	}
	if (actions.length) {
		// Buscar detalhes de qualquer card ainda não presente nos upserts
		const actionCardIds = Array.from(
			new Set(
				actions
					.map((a) => (a && a.data && a.data.card && a.data.card.id ? a.data.card.id : null))
					.filter(Boolean)
			)
		);
		const missingCardIds = actionCardIds.filter((id) => !cardsById.has(id));
		if (missingCardIds.length) {
			const fetched = await Promise.all(
				missingCardIds.map((id) =>
					trelloGet(`/cards/${id}`, { fields: 'name,desc,url,idList,closed,due,idBoard,idMembers,idLabels' }).catch(() => null)
				)
			);
			for (const c of fetched) if (c && c.id) cardsById.set(c.id, c);
		}

		const alines = [];
		alines.push('BEGIN;');
		for (const a of actions) {
			const type = a.type;
			const actionId = a.id;
			const date = a.date;
			const data = a.data || {};
			const card = data.card || {};
			const boardData = data.board || {};
			const listBefore = data.listBefore || data.list || null;
			const listAfter = data.listAfter || null;
			const member = a.member || a.memberCreator || data.member || null;

			// Garantir board
			if (boardData && boardData.id) {
				alines.push(`SELECT public.fn_upsert_board(${sqlLit(boardData.id)}, ${sqlLit(boardData.name || null)}, NULL);`);
			}
			// Garantir listas referenciadas
			if (listBefore && listBefore.id) {
				alines.push(`SELECT public.fn_upsert_list(${sqlLit(listBefore.id)}, ${sqlLit(boardData.id)}, ${sqlLit(listBefore.name || null)}, NULL, FALSE);`);
			}
			if (listAfter && listAfter.id) {
				alines.push(`SELECT public.fn_upsert_list(${sqlLit(listAfter.id)}, ${sqlLit(boardData.id)}, ${sqlLit(listAfter.name || null)}, NULL, FALSE);`);
			}
			// Garantir membro envolvido
			if (member && member.id) {
				alines.push(`SELECT public.fn_upsert_member(${sqlLit(member.id)}, ${sqlLit(member.username || null)}, ${sqlLit(member.fullName || null)}, NULL);`);
				alines.push(`SELECT public.fn_upsert_board_member(${sqlLit(boardData.id)}, ${sqlLit(member.id)}, NULL);`);
			}
			// Garantir card referenciado
			if (card && card.id) {
				let c = cardsById.get(card.id);
				if (!c) {
					// fallback mínimo a partir do action
					c = { id: card.id, idBoard: boardData.id, idList: (listAfter && listAfter.id) || (listBefore && listBefore.id) || null, name: card.name || null, desc: null, url: null, closed: false, due: null };
				}
				alines.push(
					`SELECT public.fn_upsert_card(${sqlLit(c.id)}, ${sqlLit(c.idBoard || boardData.id)}, ${sqlLit(c.idList)}, ${sqlLit(c.name)}, ${sqlLit(c.desc)}, ${sqlLit(c.url)}, ${sqlLit(!!c.closed)}, ${sqlLit(c.due)});`
				);
			}

			// Sempre registra webhook_event e card_event
			alines.push(
				`SELECT public.fn_record_webhook_event(${sqlLit(boardData.id)}, ${sqlLit(actionId)}, ${sqlLit(type)}, ${sqlLit(JSON.stringify(a))}::jsonb);`
			);
			alines.push(
				`SELECT public.fn_record_card_event(${sqlLit(actionId)}, ${sqlLit(type)}, ${sqlLit(card.id)}, ${sqlLit(boardData.id)}, ${sqlLit(listBefore && listBefore.id)}, ${sqlLit(listAfter && listAfter.id)}, ${sqlLit(member && member.id)}, ${sqlLit(date)}, ${sqlLit(JSON.stringify(a))}::jsonb);`
			);

			if (type === 'updateCard' && data.listAfter && data.listBefore && card && card.id) {
				alines.push(
					`SELECT public.fn_set_card_list_by_trello(${sqlLit(card.id)}, ${sqlLit(listAfter.id)}, ${sqlLit(member && member.id)}, ${sqlLit(date)}, ${sqlLit(actionId)});`
				);
			}
			if (type === 'addMemberToCard' && data.member && card && card.id) {
				alines.push(`SELECT public.fn_attach_card_members(${sqlLit(card.id)}, ARRAY[${sqlLit(data.member.id)}]);`);
			}
			if (type === 'addLabelToCard' && data.label && card && card.id) {
				alines.push(`SELECT public.fn_upsert_label(${sqlLit(data.label.id)}, ${sqlLit(boardData.id)}, ${sqlLit(data.label.name)}, ${sqlLit(data.label.color)});`);
				alines.push(`SELECT public.fn_attach_card_labels(${sqlLit(card.id)}, ARRAY[${sqlLit(data.label.id)}]);`);
			}
		}
		alines.push('COMMIT;');
		await applySqlBatch(alines, 'trello_actions');
	}

	// Validações básicas
	const validateSql = [
		'\\timing on',
		"SELECT 'boards' tbl, COUNT(*) FROM public.boards;",
		"SELECT 'members' tbl, COUNT(*) FROM public.members;",
		"SELECT 'board_members' tbl, COUNT(*) FROM public.board_members;",
		"SELECT 'lists' tbl, COUNT(*) FROM public.lists;",
		"SELECT 'labels' tbl, COUNT(*) FROM public.labels;",
		"SELECT 'cards' tbl, COUNT(*) FROM public.cards;",
		"SELECT 'card_labels' tbl, COUNT(*) FROM public.card_labels;",
		"SELECT 'card_members' tbl, COUNT(*) FROM public.card_members;",
		"SELECT 'card_movements' tbl, COUNT(*) FROM public.card_movements;",
		"SELECT 'card_events' tbl, COUNT(*) FROM public.card_events;",
		"SELECT 'webhook_events' tbl, COUNT(*) FROM public.webhook_events;",
		`SELECT c.trello_id as card_tid, l.trello_id as list_tid, b.trello_id as board_tid
		 FROM public.cards c LEFT JOIN public.lists l ON c.current_list_id = l.id
		 JOIN public.boards b ON c.board_id = b.id
		 ORDER BY c.created_at DESC NULLS LAST LIMIT 5;`,
	].join('\n');

	const tmpVal = path.join(__dirname, 'tmp_validate.sql');
	fs.writeFileSync(tmpVal, validateSql, 'utf8');
	await runCmd(`docker cp "${tmpVal}" ${CONTAINER}:/tmp/tmp_validate.sql`);
	const { stdout } = await runCmd(
		`docker exec ${CONTAINER} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -f /tmp/tmp_validate.sql`
	);
	console.log(stdout);
}

main().catch((err) => {
	console.error('Falha no seed Trello:', err.message);
	process.exit(1);
});
