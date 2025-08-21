// Auditoria: Trello (lista de criação real) vs Supabase (cards.created_list_*)
// Saída: JSON com totais e divergências por lista

import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

async function loadDotEnvInto(envObj) {
	try {
		const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
		const rootEnvPath = path.resolve(__dirname, '../.env')
		const stat = await fs.stat(rootEnvPath).catch(() => null)
		if (!stat || !stat.isFile()) return envObj
		const content = await fs.readFile(rootEnvPath, 'utf8')
		for (const raw of content.split(/\r?\n/)) {
			if (!raw) continue
			const line = raw.trim()
			if (!line || line.startsWith('#')) continue
			const idx = line.indexOf('=')
			if (idx < 1) continue
			const key = line.slice(0, idx).trim()
			let value = line.slice(idx + 1).trim()
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
			if (key && typeof envObj[key] === 'undefined') envObj[key] = value
		}
	} catch {}
	return envObj
}

function qs(params) { return new URLSearchParams(params).toString() }

async function fetchJson(url, init) {
	const res = await fetch(url, init)
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`)
	return res.json()
}

async function main() {
	const env = await loadDotEnvInto({ ...process.env })
	const key = env.TRELLO_API_KEY
	const token = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN
	const boardId = env.TRELLO_BOARD_ID
	const supaUrl = env.SUPABASE_URL
	const supaKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
	if (!key || !token || !boardId) throw new Error('Faltam variáveis do Trello (TRELLO_API_KEY/TRELLO_TOKEN/TRELLO_BOARD_ID)')
	if (!supaUrl || !supaKey) throw new Error('Faltam variáveis do Supabase (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)')

	// 1) Coletar listas e até 1000 cards do board
	const lists = await fetchJson(`https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/lists?` + qs({ key, token, fields: 'id,name,closed,pos', limit: '1000' }))
	const listNameById = new Map(lists.map(l => [String(l.id), String(l.name || '')]))
	const cards = await fetchJson(`https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/cards?` + qs({ key, token, fields: 'id,name,shortUrl', limit: '1000' }))
	const sample = Array.isArray(cards) ? cards.slice(0, 200) : []

	// 2) Para cada card, achar lista de criação no Trello
	async function getTrelloCreation(cardId) {
		const baseParams = { key, token, limit: '1000', fields: 'data,date' }
		let acts = await fetchJson(`https://api.trello.com/1/cards/${encodeURIComponent(cardId)}/actions?` + qs({ ...baseParams, filter: 'createCard,copyCard,convertToCardFromCheckItem' }))
		if (!Array.isArray(acts) || acts.length === 0) {
			acts = await fetchJson(`https://api.trello.com/1/cards/${encodeURIComponent(cardId)}/actions?` + qs({ ...baseParams, filter: 'all' }))
		}
		if (!Array.isArray(acts) || acts.length === 0) return { listId: null, listName: null }
		acts.sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0))
		let first = acts[0]
		if (!(first?.data?.list?.id || first?.data?.card?.idList)) first = acts.find(a => a?.data?.list?.id || a?.data?.card?.idList) || first
		const listId = first?.data?.list?.id || first?.data?.card?.idList || null
		const listName = first?.data?.list?.name || listNameById.get(String(listId)) || null
		return { listId, listName }
	}

	// 3) Buscar created_list_* no Supabase em lote
	const chunkSize = 100
	const supaCards = []
	for (let i = 0; i < sample.length; i += chunkSize) {
		const chunk = sample.slice(i, i + chunkSize)
		const inList = '(' + chunk.map(c => '"' + c.id + '"').join(',') + ')'
		const url = `${supaUrl}/rest/v1/cards?select=id,trello_id,created_list_id,created_list_trello_id,current_list_id&trello_id=in.${encodeURIComponent(inList)}`
		const rows = await fetchJson(url, { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } })
		supaCards.push(...rows)
	}
	const supaByTrello = new Map(supaCards.map(r => [String(r.trello_id), r]))

	// 4) Rodar em paralelo (concorrência limitada)
	const concurrency = 8
	const results = []
	for (let i = 0; i < sample.length; i += concurrency) {
		const slice = sample.slice(i, i + concurrency)
		const parts = await Promise.all(slice.map(async (c) => {
			try {
				const t = await getTrelloCreation(c.id)
				const s = supaByTrello.get(String(c.id)) || null
				let supaListId = s?.created_list_id || null
				let supaListTrelloId = s?.created_list_trello_id || null
				const row = {
					card_id: c.id,
					card_name: c.name,
					trello_created_list_id: t.listId,
					trello_created_list_name: t.listName,
					supabase_created_list_id: supaListId,
					supabase_created_list_trello_id: supaListTrelloId,
				}
				return row
			} catch {
				return { card_id: c.id, card_name: c.name, error: true }
			}
		}))
		results.push(...parts)
	}

	// 5) Comparar e agregar
	const diff = []
	const byList = new Map()
	for (const r of results) {
		if (r.error) continue
		const supaKey = String(r.supabase_created_list_trello_id || r.supabase_created_list_id || '')
		const trelloKey = String(r.trello_created_list_id || '')
		const mismatch = !!(trelloKey && supaKey && trelloKey !== supaKey)
		if (mismatch || !supaKey) diff.push(r)
		const nm = r.trello_created_list_name || '—'
		if (!byList.has(nm)) byList.set(nm, { list_name: nm, trello_count: 0, supa_same: 0, supa_missing: 0, supa_mismatch: 0 })
		const agg = byList.get(nm)
		agg.trello_count += 1
		if (!supaKey) agg.supa_missing += 1
		else if (trelloKey === supaKey) agg.supa_same += 1
		else agg.supa_mismatch += 1
	}

	console.log(JSON.stringify({ total_sample: results.length, mismatches: diff.length, by_list: Array.from(byList.values()).sort((a,b)=>b.trello_count-a.trello_count), examples: diff.slice(0, 20) }))
}

main().catch(e => { console.error(e); process.exit(1) })


