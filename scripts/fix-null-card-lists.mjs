/* Corrige cards com current_list_id nulo consultando o Trello */
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function trelloGet(path) {
  const url = new URL(`https://api.trello.com/1/${path.replace(/^\//, '')}`)
  url.searchParams.set('key', TRELLO_API_KEY)
  url.searchParams.set('token', TRELLO_API_TOKEN)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Trello GET ${url} -> ${res.status}`)
  return res.json()
}

async function main() {
  console.log('Fix null current_list_id: iniciando...')
  const { data: rows, error } = await supabase
    .from('cards')
    .select('id, trello_id')
    .is('current_list_id', null)
    .eq('is_closed', false)
    .limit(20000)
  if (error) throw new Error('Supabase select cards: ' + error.message)
  console.log(`Cards a corrigir: ${rows?.length || 0}`)
  let ok = 0, fail = 0
  for (const r of rows || []) {
    try {
      const card = await trelloGet(`/cards/${r.trello_id}?fields=idList,idBoard,closed`)
      if (!card || !card.idList) { continue }
      // garantir lista e board
      if (card.idBoard) {
        await supabase.rpc('fn_upsert_board', { p_trello_id: card.idBoard, p_name: null, p_url: null })
      }
      await supabase.rpc('fn_upsert_list', { p_trello_id: card.idList, p_board_trello_id: card.idBoard || null, p_name: null, p_pos: null, p_closed: false })
      // setar lista via função de movimentação
      const { error: err } = await supabase.rpc('fn_set_card_list_by_trello', {
        p_card_trello_id: r.trello_id,
        p_to_list_trello_id: card.idList,
        p_moved_by_member_trello_id: null,
        p_moved_at: null,
        p_trello_action_id: `fix-null-list-${r.trello_id}`
      })
      if (err) throw new Error(err.message)
      ok++
      if (ok % 100 === 0) console.log(`Ajustados: ${ok}`)
    } catch (e) {
      fail++
      if (fail <= 10) console.warn('Falha em card', r.trello_id, e.message)
    }
  }
  console.log(`Concluído. Ajustados: ${ok}. Falhas: ${fail}.`)
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1) })


