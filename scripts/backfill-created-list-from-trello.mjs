// Backfill de created_list_* em public.cards consultando a API do Trello
// - Usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// - Usa TRELLO_API_KEY, (TRELLO_API_TOKEN ou TRELLO_TOKEN)
// - Opcional: TRELLO_BOARD_ID (não estritamente necessário para actions por card)

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
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1)
			}
			if (key && typeof envObj[key] === 'undefined') envObj[key] = value
		}
	} catch {}
	return envObj
}

function qs(params) { return new URLSearchParams(params).toString() }

async function main() {
	const env = await loadDotEnvInto({ ...process.env })
	const SUPABASE_URL = env.SUPABASE_URL
	const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
	const TRELLO_API_KEY = env.TRELLO_API_KEY
	const TRELLO_TOKEN = env.TRELLO_API_TOKEN || env.TRELLO_TOKEN
	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes')
	if (!TRELLO_API_KEY || !TRELLO_TOKEN) throw new Error('TRELLO_API_KEY e TRELLO_API_TOKEN/TRELLO_TOKEN ausentes')

	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

	// Selecionar cards sem created_list_trello_id definido, em lotes
	const pageSize = 100
	let processed = 0
	let updated = 0
	let page = 0
	while (true) {
		const from = page * pageSize
		const to = from + pageSize - 1
		const { data: cards, error } = await supabase
			.from('cards')
			.select('id, trello_id, created_list_trello_id, created_list_id')
			.is('created_list_trello_id', null)
			.order('id', { ascending: true })
			.range(from, to)
		if (error) throw error
		if (!cards || cards.length === 0) break

		// Processar com concorrência limitada
		const concurrency = 5
		for (let i = 0; i < cards.length; i += concurrency) {
			const slice = cards.slice(i, i + concurrency)
			await Promise.all(slice.map(async (c) => {
				if (!c?.trello_id) { processed++; return }
				try {
					const baseParams = { key: TRELLO_API_KEY, token: TRELLO_TOKEN, limit: '1000', fields: 'data,date' }
					const actionsUrl = `https://api.trello.com/1/cards/${encodeURIComponent(c.trello_id)}/actions?` +
						qs({ ...baseParams, filter: 'createCard,copyCard,convertToCardFromCheckItem' })
					let res = await fetch(actionsUrl)
					if (!res.ok) { processed++; return }
					let acts = await res.json()
					if (!Array.isArray(acts) || acts.length === 0) {
						// Fallback: pegar todas as ações e usar a primeira com list/card.idList
						const allUrl = `https://api.trello.com/1/cards/${encodeURIComponent(c.trello_id)}/actions?` + qs({ ...baseParams, filter: 'all' })
						res = await fetch(allUrl)
						if (!res.ok) { processed++; return }
						acts = await res.json()
					}
					if (!Array.isArray(acts) || acts.length === 0) { processed++; return }
					acts.sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0))
					let first = acts[0]
					// Se a primeira não tiver lista, procure a primeira que tiver
					if (!(first?.data?.list?.id || first?.data?.card?.idList)) {
						const withList = acts.find(a => a?.data?.list?.id || a?.data?.card?.idList)
						if (withList) first = withList
					}
					let listTrelloId = first?.data?.list?.id || first?.data?.card?.idList || null
					let listName = first?.data?.list?.name || null
					if (!listTrelloId) { processed++; return }

					// Garantir lista no banco (quando há coluna trello_id)
					try {
						await supabase.from('lists').upsert([{ trello_id: listTrelloId, name: listName || null }], { onConflict: 'trello_id' })
					} catch {}
					let listId = null
					try {
						const { data: lrow } = await supabase.from('lists').select('id').eq('trello_id', listTrelloId).maybeSingle()
						listId = lrow?.id || null
					} catch {}

					const upd = { id: c.id, created_list_trello_id: listTrelloId }
					if (listId) upd.created_list_id = listId
					const { error: upErr } = await supabase.from('cards').upsert([upd], { onConflict: 'id' })
					if (!upErr) updated++
				} catch {}
				processed++
			}))
		}
		page++
	}
	console.log(JSON.stringify({ processed, updated }))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})


