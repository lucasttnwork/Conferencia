/* Preenche created_by_member_id a partir de ações createCard (últimos 60 dias) */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function assertEnv(name) {
	const v = process.env[name]
	if (!v || !String(v).trim()) throw new Error(`Variável ausente: ${name}`)
	return v
}

const SUPABASE_URL = assertEnv('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY')
const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY')
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN')
const TRELLO_BOARD_ID = assertEnv('TRELLO_BOARD_ID')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function getFetch() {
	if (typeof fetch !== 'undefined') return fetch
	const mod = await import('node-fetch')
	return mod.default
}

function trelloUrl(pathname, params = {}) {
	const url = new URL(`https://api.trello.com/1/${pathname.replace(/^\//, '')}`)
	url.searchParams.set('key', TRELLO_API_KEY)
	url.searchParams.set('token', TRELLO_API_TOKEN)
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
	})
	return url.toString()
}

async function trelloGet(pathname, params) {
	const f = await getFetch()
	const url = trelloUrl(pathname, params)
	const res = await f(url)
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Falha Trello GET ${url}: ${res.status} ${text}`)
	}
	return res.json()
}

function limitConcurrency(limit) {
	let active = 0
	const queue = []
	const next = () => { const r = queue.shift(); if (r) r() }
	return async (fn) => { if (active >= limit) await new Promise(r => queue.push(r)); active++; try { return await fn() } finally { active--; next() } }
}
const runLimited = limitConcurrency(10)

async function main() {
	console.log('Preenchendo created_by_member_id via createCard (60d)...')
	const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
	let before = null
	let total = 0, ok = 0, fail = 0
	while (true) {
		const batch = await trelloGet(`/boards/${TRELLO_BOARD_ID}/actions`, { limit: 1000, filter: 'createCard', before }).catch(() => [])
		if (!batch || batch.length === 0) break
		const last = batch[batch.length - 1]
		const lastDate = last && last.date ? new Date(last.date) : null
		await Promise.all(batch.map(a => runLimited(async () => {
			try {
				const card = a?.data?.card
				const board = a?.data?.board
				const member = a?.memberCreator || a?.member || a?.data?.member
				if (!card?.id || !member?.id) { return }
				// garantir membro e relação com board
				await supabase.rpc('fn_upsert_member', {
					p_trello_id: member.id,
					p_username: member.username || null,
					p_full_name: member.fullName || null,
					p_email: null
				})
				if (board?.id) {
					await supabase.rpc('fn_upsert_board_member', {
						p_board_trello_id: board.id,
						p_member_trello_id: member.id,
						p_role: null
					})
				}
				// buscar UUID do membro
				const { data: mrow } = await supabase.from('members').select('id').eq('trello_id', member.id).maybeSingle()
				if (!mrow?.id) { return }
				// atualizar card se ainda está nulo
				const { error: updErr } = await supabase
					.from('cards')
					.update({ created_by_member_id: mrow.id, updated_at: new Date().toISOString() })
					.eq('trello_id', card.id)
					.is('created_by_member_id', null)
				if (updErr) throw new Error(updErr.message)
				ok++
			} catch (e) {
				fail++
				if (fail <= 10) console.warn('Falha createCard:', e.message)
			}
		})))
		total += batch.length
		console.log(`Página: +${batch.length}, acumulado: ${total}, atualizados: ${ok}`)
		if (!lastDate || lastDate <= since) break
		before = last.date
	}
	console.log(`Concluído. Ações lidas: ${total}. Cards atualizados: ${ok}. Falhas: ${fail}.`)
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1) })
