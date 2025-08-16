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

async function tableHasColumn(client: any, table: string, column: string): Promise<boolean> {
  try {
    const { error } = await client.from(table).select(column).limit(0)
    return !error
  } catch {
    return false
  }
}

async function getRawBody(request: Request): Promise<string> {
  // O Trello assina o corpo bruto. Precisamos do texto original.
  return await request.text()
}

function normalizeCallbackUrl(url: string): string {
  // Remove espaços, ponto e vírgula e barras finais redundantes
  return String(url).trim().replace(/;+$/, '').replace(/\/+$/, '')
}

function looksLikeUuid(value: string): boolean {
  // v4 UUID com hifens ou 32 hex sem hifens
  const uuidHyphenated = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const uuidCompact = /^[0-9a-f]{32}$/i
  return uuidHyphenated.test(value) || uuidCompact.test(value)
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

    let eventType: 'create' | 'move' | 'update' | 'delete' | 'comment' | 'archive' | 'unarchive' | 'other' = 'other'
    let listFrom: any = null
    let listTo: any = null

    if (actionType === 'createCard') {
      eventType = 'create'
      listTo = data.list || null
    } else if (actionType === 'updateCard' && data?.listBefore && data?.listAfter) {
      eventType = 'move'
      listFrom = data.listBefore
      listTo = data.listAfter
    } else if (actionType === 'updateCard' && typeof data?.card?.closed === 'boolean') {
      // Arquivamento / Desarquivamento explícitos
      eventType = data.card.closed ? 'archive' : 'unarchive'
    } else if (actionType === 'deleteCard') {
      eventType = 'delete'
    } else if (actionType === 'commentCard') {
      eventType = 'comment'
    } else {
      eventType = 'update'
    }

    // Inserir evento bruto para auditoria (idempotente por trello_action_id)
    const { error: cardEventsError } = await supabase.from('card_events').upsert({
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
    }, { onConflict: 'trello_action_id' })
    if (cardEventsError) {
      console.error('[Webhook Trello] Erro ao upsert em card_events:', cardEventsError)
    }

    // Resolver IDs auxiliares
    const boardId: string | null = board?.id || (typeof data?.card?.idBoard === 'string' ? data.card.idBoard : null) || null

    // Pré-checar colunas opcionais em tabelas externas
    const hasBoards = await tableHasColumn(supabase, 'boards', 'id')
    const hasMembers = await tableHasColumn(supabase, 'members', 'id')
    const listsHasBoardId = await tableHasColumn(supabase, 'lists', 'board_id')
    const cardsHasBoardId = await tableHasColumn(supabase, 'cards', 'board_id')
    const cardsHasTrelloId = await tableHasColumn(supabase, 'cards', 'trello_id')
    const membersHasUsername = await tableHasColumn(supabase, 'members', 'username')
    const membersHasFullName = await tableHasColumn(supabase, 'members', 'full_name')
    const membersHasFullNameCamel = await tableHasColumn(supabase, 'members', 'fullName')
    const movementsHasBoardId = await tableHasColumn(supabase, 'card_movements', 'board_id')
    const movementsHasMovedByMember = await tableHasColumn(supabase, 'card_movements', 'moved_by_member_id')

    // Upsert de entidades de referência antes (boards, members)
    if (hasBoards && boardId) {
      // Evitar 22P02 quando a coluna "id" for UUID em DB externo: só tenta se parecer UUID
      if (looksLikeUuid(boardId)) {
        const { error: boardsError } = await supabase
          .from('boards')
          .upsert([{ id: boardId, name: board?.name || null }], { onConflict: 'id' })
        if (boardsError) {
          console.error('[Webhook Trello] Erro ao upsert em boards:', boardsError)
        }
      } else {
        console.warn('[Webhook Trello] Ignorando upsert em boards: boardId não é UUID compatível com schema existente')
      }
    }
    if (hasMembers && member?.id) {
      try {
        const memberPayload: Record<string, any> = { id: member.id }
        if (membersHasUsername) memberPayload.username = member.username || null
        if (membersHasFullName) memberPayload.full_name = member.fullName || null
        else if (membersHasFullNameCamel) memberPayload.fullName = member.fullName || null

        const { error: membersError } = await supabase
          .from('members')
          .upsert([memberPayload], { onConflict: 'id' })
        if (membersError) {
          console.error('[Webhook Trello] Erro ao upsert em members:', membersError)
        }
      } catch (e) {
        console.error('[Webhook Trello] Falha ao upsert em members:', e)
      }
    }

    // Upsert em lists/cards para manter estado atual
    const listsToUpsert: Array<Record<string, any>> = []
    if (listFrom?.id) listsToUpsert.push({ id: listFrom.id, name: listFrom.name || null })
    if (listTo?.id) listsToUpsert.push({ id: listTo.id, name: listTo.name || null })
    // Fallback: alguns eventos trazem apenas card.idList
    const idListFallback: string | null = typeof data?.card?.idList === 'string' ? data.card.idList : null
    if (idListFallback && !listsToUpsert.some(l => l.id === idListFallback)) {
      const stub: Record<string, any> = { id: idListFallback, name: null }
      if (listsHasBoardId && boardId) stub.board_id = boardId
      listsToUpsert.push(stub)
    }
    if (listsToUpsert.length > 0) {
      const { error: listsError } = await supabase.from('lists').upsert(listsToUpsert, { onConflict: 'id' })
      if (listsError) {
        console.error('[Webhook Trello] Erro ao upsert em lists:', listsError)
      }
    }

    if (card?.id) {
      const updateBase: Record<string, any> = {
        id: card.id,
        name: card.name || null,
      }
      if (eventType === 'create' && listTo?.id) {
        updateBase.current_list_id = listTo.id
      }
      if (eventType === 'move' && listTo?.id) {
        updateBase.current_list_id = listTo.id
      }
      // Atualizar status de arquivamento
      if (eventType === 'archive') {
        updateBase.is_closed = true
      } else if (eventType === 'unarchive') {
        updateBase.is_closed = false
      } else if (typeof data?.card?.closed === 'boolean') {
        updateBase.is_closed = Boolean(data.card.closed)
      }
      if (eventType === 'delete') {
        updateBase.is_closed = true
      }
      // Fallback: idList
      if (!updateBase.current_list_id && typeof data?.card?.idList === 'string' && (eventType === 'update' || eventType === 'unarchive' || eventType === 'archive')) {
        updateBase.current_list_id = data.card.idList
      }

      // Tentar incluir board_id se existir na tabela
      let updatePayload: Record<string, any> = { ...updateBase }
      // Atender schemas que exigem trello_id NOT NULL
      if (cardsHasTrelloId && card.id) {
        updatePayload.trello_id = card.id
      }
      if (cardsHasBoardId && boardId) {
        updatePayload.board_id = boardId
      }
      let { error: cardsError } = await supabase.from('cards').upsert([updatePayload], { onConflict: 'id' })
      if (cardsError && (cardsHasBoardId || cardsHasTrelloId)) {
        // Fallback: tenta sem board_id, mas mantendo trello_id se existir
        const fallback: Record<string, any> = { ...updateBase }
        if (cardsHasTrelloId && card.id) fallback.trello_id = card.id
        const { error: cardsErrorFallback } = await supabase.from('cards').upsert([fallback], { onConflict: 'id' })
        if (cardsErrorFallback) {
          console.error('[Webhook Trello] Erro ao upsert em cards (fallback também falhou):', cardsErrorFallback, { update: updateBase })
        }
      } else if (cardsError) {
        console.error('[Webhook Trello] Erro ao upsert em cards:', cardsError, { update: updatePayload })
      }
    }

    // Registrar movimentações explícitas (idempotente por trello_action_id)
    if (eventType === 'move' || eventType === 'create') {
      try {
        const movementBase: Record<string, any> = {
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
        }
        let movementPayload: Record<string, any> = { ...movementBase }
        if (movementsHasBoardId && boardId) movementPayload.board_id = boardId
        if (movementsHasMovedByMember && member?.id) movementPayload.moved_by_member_id = member.id

        let { error: movementErrorUpsert } = await supabase.from('card_movements').upsert(movementPayload, { onConflict: 'trello_action_id' })
        if (movementErrorUpsert && (movementsHasBoardId || movementsHasMovedByMember)) {
          // Fallback: tentar sem campos adicionais
          const { error: movementErrorFallback } = await supabase.from('card_movements').upsert(movementBase, { onConflict: 'trello_action_id' })
          if (movementErrorFallback) {
            console.error('[Webhook Trello] Erro ao upsert em card_movements (fallback também falhou):', movementErrorFallback)
          }
        } else if (movementErrorUpsert) {
          console.error('[Webhook Trello] Erro ao upsert em card_movements:', movementErrorUpsert)
        }
      } catch (movementError) {
        console.warn('[Webhook Trello] Falha ao inserir em card_movements (tabela ausente?):', movementError)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook do Trello:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Erro interno', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}


