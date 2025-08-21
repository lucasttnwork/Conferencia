// Reescrita completa de created_list_* para TODOS os cards, consultando a API do Trello
// - Para cada card: busca a primeira ação de criação (createCard/copyCard/convertToCardFromCheckItem)
// - Atualiza created_list_trello_id e resolve created_list_id via lists

import { createClient } from '@supabase/supabase-js'
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

async function fetchJson(url) {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`)
	return res.json()
}

async function main() {
	const env = await loadDotEnvInto({ ...process.env })
	const SUPABASE_URL = env.SUPABASE_URL
	const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
	const TRELLO_API_KEY = env.TRELLO_API_KEY
	const TRELLO_TOKEN = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN
	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes')
	if (!TRELLO_API_KEY || !TRELLO_TOKEN) throw new Error('TRELLO_API_KEY e TRELLO_API_TOKEN/TRELLO_TOKEN ausentes')

	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

	let processed = 0
	let updated = 0
	let updateErrors = 0
	const errorSamples = []
	const pageSize = 200
	let page = 0
	while (true) {
		const from = page * pageSize
		const to = from + pageSize - 1
		const { data: cards, error } = await supabase
			.from('cards')
			.select('id, trello_id, created_list_trello_id, created_list_id')
			.order('id', { ascending: true })
			.range(from, to)
		if (error) throw error
		if (!cards || cards.length === 0) break

		const concurrency = 5
		for (let i = 0; i < cards.length; i += concurrency) {
			const slice = cards.slice(i, i + concurrency)
			await Promise.all(slice.map(async (c) => {
				if (!c?.trello_id) { processed++; return }
				try {
					const baseParams = { key: TRELLO_API_KEY, token: TRELLO_TOKEN, limit: '1000', fields: 'data,date' }
					let acts = await fetchJson(`https://api.trello.com/1/cards/${encodeURIComponent(c.trello_id)}/actions?` + qs({ ...baseParams, filter: 'createCard,copyCard,convertToCardFromCheckItem' }))
					if (!Array.isArray(acts) || acts.length === 0) {
						acts = await fetchJson(`https://api.trello.com/1/cards/${encodeURIComponent(c.trello_id)}/actions?` + qs({ ...baseParams, filter: 'all' }))
					}
					if (!Array.isArray(acts) || acts.length === 0) { processed++; return }
					acts.sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0))
					let first = acts[0]
					if (!(first?.data?.list?.id || first?.data?.card?.idList)) {
						const withList = acts.find(a => a?.data?.list?.id || a?.data?.card?.idList)
						if (withList) first = withList
					}
					const listTrelloId = first?.data?.list?.id || first?.data?.card?.idList || null
					const listName = first?.data?.list?.name || null
					if (!listTrelloId) { processed++; return }

					// Upsert lista e resolver UUID
					try { await supabase.from('lists').upsert([{ trello_id: listTrelloId, name: listName || null }], { onConflict: 'trello_id' }) } catch {}
					let listId = null
					try {
						const { data: lrow } = await supabase.from('lists').select('id').eq('trello_id', listTrelloId).maybeSingle()
						listId = lrow?.id || null
					} catch {}

					const payload = { created_list_trello_id: listTrelloId, ...(listId ? { created_list_id: listId } : {}) }
					// Tenta UPDATE direto (evita peculiaridades do upsert)
					let { error: upErr, status } = await supabase.from('cards').update(payload).eq('id', c.id)
					if (upErr) {
						// Fallback para UPSERT
						const upd = { id: c.id, ...payload }
						const { error: upErr2 } = await supabase.from('cards').upsert([upd], { onConflict: 'id' })
						if (upErr2) {
							updateErrors++; if (errorSamples.length < 5) errorSamples.push(String(upErr2.message || upErr2))
						} else {
							updated++
						}
					} else {
						updated++
					}
				} catch {}
				processed++
			}))
		}
		page++
	}
	console.log(JSON.stringify({ processed, updated, updateErrors, errorSamples }))
}

main().catch((e) => { console.error(e); process.exit(1) })


