import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

type TrelloAction = {
  id: string
  type: string
  date: string
  memberCreator?: {
    id: string
    username?: string
    fullName?: string
  }
  data: any
}

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

const TRELLO_API_SECRET = process.env.TRELLO_API_SECRET as string | undefined
const TRELLO_WEBHOOK_CALLBACK_URL = process.env.TRELLO_WEBHOOK_CALLBACK_URL as string | undefined
const TRELLO_ALLOW_UNVERIFIED = String(process.env.TRELLO_ALLOW_UNVERIFIED || '').toLowerCase() === 'true'

function buildSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Variáveis do Supabase ausentes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function getRawBody(request: Request): Promise<string> {
  // O Trello assina o corpo bruto. Precisamos do texto original.
  return await request.text()
}

function verifyTrelloSignature(rawBody: string): boolean {
  if (!TRELLO_API_SECRET || !TRELLO_WEBHOOK_CALLBACK_URL) return false
  // A assinatura do Trello é HMAC-SHA1 em base64 de (rawBody + callbackURL)
  const expected = crypto
    .createHmac('sha1', TRELLO_API_SECRET)
    .update(rawBody + TRELLO_WEBHOOK_CALLBACK_URL)
    .digest('base64')
  return expected
    ? expected.length > 0
    : false
}

function isValidSignatureHeader(headerValue: string | null | undefined, computed: string): boolean {
  if (!headerValue) return false
  // Alguns proxies podem alterar capitalização; comparação direta basta
  return headerValue === computed
}

export async function GET() {
  // Trello pode pingar seu endpoint. Responder 200 confirma disponibilidade
  return NextResponse.json({ ok: true })
}

export async function HEAD() {
  // Trello usa HEAD ao criar webhooks para verificar callbackURL
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: Request) {
  try {
    const rawBody = await getRawBody(request)

    // Verificar assinatura do Trello
    const signatureHeader = request.headers.get('x-trello-webhook')
    if (!TRELLO_API_SECRET || !TRELLO_WEBHOOK_CALLBACK_URL) {
      return NextResponse.json(
        { error: 'TRELLO_API_SECRET/TRELLO_WEBHOOK_CALLBACK_URL não configurados' },
        { status: 500 }
      )
    }

    const computed = crypto
      .createHmac('sha1', TRELLO_API_SECRET)
      .update(rawBody + TRELLO_WEBHOOK_CALLBACK_URL)
      .digest('base64')

    const valid = isValidSignatureHeader(signatureHeader, computed)
    if (!valid) {
      console.error('[Webhook Trello] Assinatura inválida:', {
        received: signatureHeader,
        computed: computed,
        callbackUrl: TRELLO_WEBHOOK_CALLBACK_URL,
        allowUnverified: TRELLO_ALLOW_UNVERIFIED,
      })
      if (!TRELLO_ALLOW_UNVERIFIED) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
      console.warn('[Webhook Trello] Aceitando requisição sem validação (TRELLO_ALLOW_UNVERIFIED=true)')
    } else {
      console.log('[Webhook Trello] Assinatura válida, processando payload...')
    }

    // Processar payload
    const payload = JSON.parse(rawBody)
    const action: TrelloAction | undefined = payload?.action
    if (!action) {
      return NextResponse.json({ ok: true })
    }

    const supabase = buildSupabaseAdminClient()

    // Mapear ações relevantes: criação de card e movimentação de card entre listas
    const actionType = action.type
    const occurredAt = action.date
    const member = action.memberCreator
    const data = action.data || {}

    // Informações comuns
    const board = data.board || {}
    const card = data.card || {}

    let eventType: 'create' | 'move' | 'update' | 'delete' | 'comment' | 'other' = 'other'
    let listFrom: any = null
    let listTo: any = null

    if (actionType === 'createCard') {
      eventType = 'create'
      listTo = data.list || null
    } else if (actionType === 'updateCard' && data?.listBefore && data?.listAfter) {
      eventType = 'move'
      listFrom = data.listBefore
      listTo = data.listAfter
    } else if (actionType === 'deleteCard') {
      eventType = 'delete'
    } else if (actionType === 'commentCard') {
      eventType = 'comment'
    } else {
      eventType = 'update'
    }

    // Inserir evento bruto para auditoria
    await supabase.from('card_events').insert({
      trello_action_id: action.id,
      action_type: eventType,
      raw_action_type: actionType,
      card_id: card.id || null,
      card_name: card.name || null,
      board_id: board.id || null,
      board_name: board.name || null,
      list_from_id: listFrom?.id || null,
      list_from_name: listFrom?.name || null,
      list_to_id: listTo?.id || null,
      list_to_name: listTo?.name || null,
      member_id: member?.id || null,
      member_username: member?.username || null,
      member_fullname: member?.fullName || null,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      payload_json: payload
    })

    // Registrar movimentações explícitas
    if (eventType === 'move' || eventType === 'create') {
      try {
        await supabase.from('card_movements').insert({
          trello_action_id: action.id,
          card_id: card.id || null,
          from_list_id: listFrom?.id || null,
          from_list_name: listFrom?.name || null,
          to_list_id: listTo?.id || null,
          to_list_name: listTo?.name || null,
          member_id: member?.id || null,
          member_username: member?.username || null,
          member_fullname: member?.fullName || null,
          occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        })
      } catch (movementError) {
        console.warn('[Webhook Trello] Falha ao inserir em card_movements (tabela ausente?):', movementError)
      }
    }

    // Upsert em lists/cards para manter estado atual
    if (listTo?.id || listFrom?.id) {
      const listsToUpsert: Array<{ id: string; name: string | null }> = []
      if (listFrom?.id) listsToUpsert.push({ id: listFrom.id, name: listFrom.name || null })
      if (listTo?.id) listsToUpsert.push({ id: listTo.id, name: listTo.name || null })
      if (listsToUpsert.length > 0) {
        await supabase.from('lists').upsert(listsToUpsert, { onConflict: 'id' })
      }
    }

    if (card?.id) {
      const update: Record<string, any> = {
        id: card.id,
        name: card.name || null,
      }
      if (eventType === 'create' && listTo?.id) {
        update.current_list_id = listTo.id
      }
      if (eventType === 'move' && listTo?.id) {
        update.current_list_id = listTo.id
      }

      // Atualizar status de arquivamento quando presente
      if (typeof data?.card?.closed === 'boolean') {
        update.is_closed = Boolean(data.card.closed)
      }
      if (eventType === 'delete') {
        update.is_closed = true
      }

      await supabase.from('cards').upsert([update], { onConflict: 'id' })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook do Trello:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Erro interno', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}


