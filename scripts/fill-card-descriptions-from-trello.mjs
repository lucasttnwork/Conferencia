/*
  Preenche public.cards.description consultando a API do Trello.
  - Busca cards no Supabase sem descrição
  - Faz GET /1/cards/{id}?fields=desc para cada trello_id
  - Atualiza em lote via upsert por trello_id

  Requisitos (.env):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - TRELLO_API_KEY
  - TRELLO_API_TOKEN (ou TRELLO_TOKEN)
*/

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TRELLO_API_KEY = process.env.TRELLO_API_KEY
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN || process.env.TRELLO_TOKEN

function assertEnv(name, value) {
  if (!value || String(value).trim().length === 0) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }
  return value
}

assertEnv('SUPABASE_URL', SUPABASE_URL)
assertEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)
assertEnv('TRELLO_API_KEY', TRELLO_API_KEY)
assertEnv('TRELLO_API_TOKEN', TRELLO_API_TOKEN)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchTrelloDesc(trelloId, attempt = 0) {
  const url = new URL(`https://api.trello.com/1/cards/${encodeURIComponent(trelloId)}`)
  url.searchParams.set('key', TRELLO_API_KEY)
  url.searchParams.set('token', TRELLO_API_TOKEN)
  url.searchParams.set('fields', 'desc')
  const res = await fetch(url.toString())
  if (res.status === 404) return null
  if (res.status === 429) {
    const delayMs = Math.min(30000 * (attempt + 1), 120000)
    console.warn(`[fill-card-descriptions] 429 rate limit. Aguardando ${delayMs}ms e tentando novamente (${trelloId})`)
    await sleep(delayMs)
    if (attempt < 5) return fetchTrelloDesc(trelloId, attempt + 1)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Trello GET ${trelloId} falhou: ${res.status} ${text}`)
  }
  const json = await res.json()
  const desc = (json && typeof json.desc === 'string') ? json.desc : null
  return (desc && desc.trim().length > 0) ? desc : null
}

async function* iterateCardsWithoutDescription(batchSize = 500) {
  let from = 0
  while (true) {
    const to = from + batchSize - 1
    const { data, error } = await supabase
      .from('cards')
      .select('id, trello_id, description')
      .or('description.is.null,description.eq.')
      .order('id', { ascending: true })
      .range(from, to)
    if (error) throw error
    if (!data || data.length === 0) break
    yield data
    if (data.length < batchSize) break
    from += batchSize
  }
}

async function updateBatchByTrelloId(rows) {
  if (!rows.length) return { updated: 0 }
  let updated = 0
  for (const r of rows) {
    const { error } = await supabase
      .from('cards')
      .update({ description: r.description, updated_at: new Date().toISOString() })
      .eq('trello_id', r.trello_id)
    if (error) throw error
    updated++
  }
  return { updated }
}

async function main() {
  console.log('[fill-card-descriptions] Iniciando...')
  let totalChecked = 0
  let totalUpdated = 0
  for await (const batch of iterateCardsWithoutDescription(200)) {
    // Buscar descrições em paralelo com limite de concorrência
    const concurrency = 1
    const queue = [...batch]
    const updates = []
    let active = 0
    let idx = 0
    const runNext = async () => {
      if (idx >= queue.length) return
      const item = queue[idx++]
      active++
      try {
        const desc = await fetchTrelloDesc(item.trello_id)
        if (desc) updates.push({ trello_id: item.trello_id, description: desc })
      } catch (e) {
        console.warn(`[fill-card-descriptions] Falha ao buscar ${item.trello_id}: ${e.message}`)
      } finally {
        active--
      }
    }
    const starters = Math.min(concurrency, queue.length)
    const runners = []
    for (let i = 0; i < starters; i++) runners.push(runNext())
    while (idx < queue.length || active > 0) {
      // iniciar novas tarefas se houver slot
      while (active < concurrency && idx < queue.length) runners.push(runNext())
      await sleep(50)
    }

    // Upsert em lotes menores para evitar payloads muito grandes
    const chunkSize = 200
    for (let i = 0; i < updates.length; i += chunkSize) {
      const slice = updates.slice(i, i + chunkSize)
      if (slice.length) {
        const { updated } = await updateBatchByTrelloId(slice)
        totalUpdated += updated
      }
    }
    totalChecked += batch.length
    console.log(`[fill-card-descriptions] Lote verificado=${batch.length}, atualizados=${updates.length}, acumuladoAtualizados=${totalUpdated}`)
  }
  console.log(`[fill-card-descriptions] Concluído. Verificados=${totalChecked}, Atualizados=${totalUpdated}`)
}

main().catch((err) => {
  console.error('[fill-card-descriptions] Erro fatal:', err)
  process.exit(1)
})


