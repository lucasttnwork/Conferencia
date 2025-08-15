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

function normalizeCallbackUrl(url: string): string {
  // Remove espaços, ponto e vírgula e barras finais redundantes
  return String(url).trim().replace(/;+$/, '').replace(/\/+$/, '')
}

function resolveCallbackUrlFromEnv(): string | null {
  const forced = (process.env.FORCE_CALLBACK_URL || '').trim()
  if (forced) return normalizeCallbackUrl(forced)
  const railway = (process.env.RAILWAY_PUBLIC_DOMAIN || '').trim()
  if (railway) return normalizeCallbackUrl(`https://${railway.replace(/\/$/, '')}/api/trello/webhook`)
  const envUrl = (TRELLO_WEBHOOK_CALLBACK_URL || '').trim()
  if (envUrl) return normalizeCallbackUrl(envUrl)
  return null
}

function buildCallbackUrlVariants(primary: string, requestUrl: string, headers: Headers): string[] {
  const variants = new Set<string>()

  const add = (u: string | null | undefined) => {
    if (!u) return
    const n = normalizeCallbackUrl(u)
    if (n) {
      variants.add(n)
      variants.add(n + '/')
    }
  }

  // 1) A partir da URL "canônica" resolvida pelo ambiente
  add(primary)

  // 2) A partir da URL da requisição (pode ser 0.0.0.0:PORT)
  add(requestUrl)

  // 3) Reconstruída via cabeçalhos de proxy (Railway/Ingress)
  try {
    const forwardedProto = headers.get('x-forwarded-proto') || 'https'
    const forwardedHost = headers.get('x-forwarded-host')
    const u = new URL(requestUrl)
    if (forwardedHost) {
      add(`${forwardedProto}://${forwardedHost}${u.pathname}`)
    }
  } catch {}

  return Array.from(variants)
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
    if (!TRELLO_API_SECRET) {
      return NextResponse.json(
        { error: 'TRELLO_API_SECRET não configurado' },
        { status: 500 }
      )
    }

    // Calcular assinatura priorizando a URL de callback que foi usada no registro do webhook
    // (FORCE_CALLBACK_URL -> RAILWAY_PUBLIC_DOMAIN -> TRELLO_WEBHOOK_CALLBACK_URL)
    const resolvedCallbackUrl = resolveCallbackUrlFromEnv()
    if (!resolvedCallbackUrl) {
      return NextResponse.json(
        { error: 'URL de callback do Trello não pôde ser resolvida a partir das variáveis de ambiente' },
        { status: 500 }
      )
    }

    // Tentar múltiplas variantes de URL para cobrir diferenças sutis (barra final, host de proxy, etc.)
    const requestCallbackUrl = normalizeCallbackUrl(request.url)
    const envCallbackUrl = resolvedCallbackUrl
    const urlVariants = buildCallbackUrlVariants(envCallbackUrl, requestCallbackUrl, request.headers)

    let matched = ''
    for (const candidate of urlVariants) {
      const digest = crypto.createHmac('sha1', TRELLO_API_SECRET).update(rawBody + candidate).digest('base64')
      if (isValidSignatureHeader(signatureHeader, digest)) {
        matched = candidate
        break
      }
    }

    // Também manter os dois valores principais para log
    const computedFromRequestUrl = crypto
      .createHmac('sha1', TRELLO_API_SECRET)
      .update(rawBody + requestCallbackUrl)
      .digest('base64')
    const computedFromEnv = crypto
      .createHmac('sha1', TRELLO_API_SECRET)
      .update(rawBody + envCallbackUrl)
      .digest('base64')

    const valid = matched.length > 0

    if (!valid) {
      console.error('[Webhook Trello] Assinatura inválida:', {
        received: signatureHeader,
        computedFromRequestUrl,
        computedFromEnv,
        callbackUrl: envCallbackUrl,
        requestUrl: requestCallbackUrl,
        triedVariants: urlVariants.length,
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


