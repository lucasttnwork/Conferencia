/* Preenche created_by_member_id usando o campo idMemberCreator do card no Trello (por card, com backoff) */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function assertEnv(name) { const v = process.env[name]; if (!v || !String(v).trim()) throw new Error(`Variável ausente: ${name}`); return v }

const SUPABASE_URL = assertEnv('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY')
const TRELLO_API_KEY = assertEnv('TRELLO_API_KEY')
const TRELLO_API_TOKEN = assertEnv('TRELLO_API_TOKEN')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function trelloGet(path, params = {}, attempt = 0) {
  const url = new URL(`https://api.trello.com/1/${path.replace(/^\//, '')}`)
  url.searchParams.set('key', TRELLO_API_KEY)
  url.searchParams.set('token', TRELLO_API_TOKEN)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') || 0)
    const base = retryAfter > 0 ? retryAfter * 1000 : 1500 * Math.pow(2, Math.min(attempt, 4))
    await sleep(base + Math.floor(Math.random() * 400))
    return trelloGet(path, params, attempt + 1)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Trello GET ${url} -> ${res.status} ${text}`)
  }
  const gap = Number(process.env.TRELLO_REQ_GAP_MS || '150')
  if (gap > 0) await sleep(gap)
  return res.json()
}

function limitConcurrency(limit) {
  let active = 0
  const queue = []
  const next = () => { const r = queue.shift(); if (r) r() }
  return async (fn) => { if (active >= limit) await new Promise(r => queue.push(r)); active++; try { return await fn() } finally { active--; next() } }
}

const runLimited = limitConcurrency(Number(process.env.CREATOR_CONCURRENCY || '2'))

async function main() {
  const batchSize = Number(process.env.CREATOR_BATCH_SIZE || '200')
  console.log(`Preenchendo created_by_member_id via idMemberCreator (batch=${batchSize}, conc=${Number(process.env.CREATOR_CONCURRENCY || '2')})`)
  const { data: cards, error } = await supabase
    .from('cards')
    .select('trello_id')
    .is('created_by_member_id', null)
    .limit(batchSize)
  if (error) throw new Error('Supabase select cards: ' + error.message)
  console.log(`Pendentes neste lote: ${cards?.length || 0}`)

  let ok = 0, skip = 0, fail = 0
  await Promise.all((cards || []).map(c => runLimited(async () => {
    try {
      const card = await trelloGet(`/cards/${c.trello_id}`, { fields: 'idMemberCreator' })
      const memberTid = card?.idMemberCreator
      if (!memberTid) { skip++; return }
      await supabase.rpc('fn_upsert_member', { p_trello_id: memberTid, p_username: null, p_full_name: null, p_email: null })
      const { data: mrow } = await supabase.from('members').select('id').eq('trello_id', memberTid).maybeSingle()
      if (!mrow?.id) { skip++; return }
      const { error: updErr } = await supabase
        .from('cards')
        .update({ created_by_member_id: mrow.id, updated_at: new Date().toISOString() })
        .eq('trello_id', c.trello_id)
        .is('created_by_member_id', null)
      if (updErr) throw new Error(updErr.message)
      ok++
      if (ok % 50 === 0) console.log(`Atualizados: ${ok}`)
    } catch (e) {
      fail++
      if (fail <= 10) console.warn('Falha em', c.trello_id, e.message)
    }
  })))

  console.log(`Feito. Atualizados: ${ok}. Sem idMemberCreator: ${skip}. Falhas: ${fail}.`)
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1) })
