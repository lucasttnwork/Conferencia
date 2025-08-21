/* Corrige cards sem created_by_member_id usando o primeiro evento de criação ou primeiro movimento */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function assertEnv(name) { const v = process.env[name]; if (!v || !String(v).trim()) throw new Error(`Variável ausente: ${name}`); return v }

const SUPABASE_URL = assertEnv('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('Fix created_by_member_id: iniciando...')
  // 1) Tentar pelo primeiro movimento
  const { error: err1 } = await supabase.rpc('sql', { query: `
    WITH first_move AS (
      SELECT DISTINCT ON (cm.card_id) cm.card_id, cm.moved_by_member_id
      FROM public.card_movements cm
      WHERE cm.moved_by_member_id IS NOT NULL
      ORDER BY cm.card_id, COALESCE(cm.moved_at, cm.occurred_at) ASC
    )
    UPDATE public.cards c
    SET created_by_member_id = fm.moved_by_member_id, updated_at = NOW()
    FROM first_move fm
    WHERE c.id = fm.card_id AND c.created_by_member_id IS NULL;
  ` })
  if (err1) console.warn('Aviso (primeiro movimento):', err1.message)

  // 2) Fallback: primeiro evento de criação
  const { error: err2 } = await supabase.rpc('sql', { query: `
    WITH first_create AS (
      SELECT DISTINCT ON (ce.card_id) ce.card_id, ce.member_id
      FROM public.card_events ce
      WHERE ce.action_type = 'createCard' AND ce.member_id IS NOT NULL
      ORDER BY ce.card_id, ce.occurred_at ASC
    )
    UPDATE public.cards c
    SET created_by_member_id = fc.member_id, updated_at = NOW()
    FROM first_create fc
    WHERE c.id = fc.card_id AND c.created_by_member_id IS NULL;
  ` })
  if (err2) console.warn('Aviso (evento criação):', err2.message)

  console.log('Concluído.')
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1) })


