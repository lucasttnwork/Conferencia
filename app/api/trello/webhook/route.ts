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
    } else if (actionType === 'copyCard') {
      // Criação lógica: cards criados a partir de modelos/cópias
      eventType = 'create'
      listTo = data.list || null
      if (!listTo && typeof data?.card?.idList === 'string') {
        listTo = { id: data.card.idList }
      }
    } else if (actionType === 'convertToCardFromCheckItem') {
      // Criação lógica: cards convertidos de checklist
      eventType = 'create'
      listTo = data.list || null
      if (!listTo && typeof data?.card?.idList === 'string') {
        listTo = { id: data.card.idList }
      }
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

    // Registrar evento via função RPC (resolve ids Trello -> UUID no banco)
    try {
      // Opcional: também registrar o webhook bruto para auditoria idempotente
      try {
        const { error: whErr } = await supabase.rpc('fn_record_webhook_event', {
          p_board_trello_id: (board?.id || (typeof data?.card?.idBoard === 'string' ? data.card.idBoard : null) || null),
          p_trello_action_id: action.id,
          p_action_type: actionType,
          p_payload: payload,
        } as any)
        if (whErr) console.warn('[Webhook Trello] Erro ao registrar webhook_event:', whErr)
      } catch (e) {
        console.warn('[Webhook Trello] Falha ao registrar webhook_event (função ausente?):', e)
      }

      const { error: recErr } = await supabase.rpc('fn_record_card_event', {
        p_trello_action_id: action.id,
        // Guardamos o tipo "raw" do Trello na função (ela duplica em raw_action_type)
        p_action_type: actionType,
        p_card_trello_id: card?.id || null,
        p_board_trello_id: (board?.id || (typeof data?.card?.idBoard === 'string' ? data.card.idBoard : null) || null),
        p_list_from_trello_id: listFrom?.id || null,
        p_list_to_trello_id: listTo?.id || (typeof data?.card?.idList === 'string' ? data.card.idList : null) || null,
        p_member_trello_id: member?.id || null,
        p_occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        p_payload_json: payload,
      } as any)
      if (recErr) {
        console.error('[Webhook Trello] Erro ao registrar card_event (RPC):', recErr)
      }
    } catch (e) {
      console.error('[Webhook Trello] Falha ao chamar RPC de card_event:', e)
    }

    // Resolver IDs auxiliares
    const boardId: string | null = board?.id || (typeof data?.card?.idBoard === 'string' ? data.card.idBoard : null) || null

    // Pré-checar colunas opcionais em tabelas externas
    const hasBoards = await tableHasColumn(supabase, 'boards', 'id')
    const hasMembers = await tableHasColumn(supabase, 'members', 'id')
    const listsHasBoardId = await tableHasColumn(supabase, 'lists', 'board_id')
    const cardsHasBoardId = await tableHasColumn(supabase, 'cards', 'board_id')
    const cardsHasTrelloId = await tableHasColumn(supabase, 'cards', 'trello_id')
    const listsHasTrelloId = await tableHasColumn(supabase, 'lists', 'trello_id')
    const cardsHasCreatedListId = await tableHasColumn(supabase, 'cards', 'created_list_id')
    const cardsHasCreatedListTrelloId = await tableHasColumn(supabase, 'cards', 'created_list_trello_id')
    const boardsHasTrelloId = await tableHasColumn(supabase, 'boards', 'trello_id')
    const membersHasTrelloId = await tableHasColumn(supabase, 'members', 'trello_id')
    const membersHasUsername = await tableHasColumn(supabase, 'members', 'username')
    const membersHasFullName = await tableHasColumn(supabase, 'members', 'full_name')
    const membersHasFullNameCamel = await tableHasColumn(supabase, 'members', 'fullName')
    const movementsHasFromListName = await tableHasColumn(supabase, 'card_movements', 'from_list_name')
    const movementsHasToListName = await tableHasColumn(supabase, 'card_movements', 'to_list_name')
    const movementsHasMemberId = await tableHasColumn(supabase, 'card_movements', 'member_id')
    const movementsHasMemberUsername = await tableHasColumn(supabase, 'card_movements', 'member_username')
    const movementsHasMemberFullname = await tableHasColumn(supabase, 'card_movements', 'member_fullname')
    const movementsHasBoardId = await tableHasColumn(supabase, 'card_movements', 'board_id')
    const movementsHasMovedByMember = await tableHasColumn(supabase, 'card_movements', 'moved_by_member_id')

    // Upsert de entidades de referência antes (boards, members)
    // Resolver/assegurar board antes para poder popular FKs (board_id)
    let boardUuidForFk: string | null = null
    if (hasBoards && boardId) {
      try {
        if (boardsHasTrelloId) {
          const { error: boardsError } = await supabase
            .from('boards')
            .upsert([{ trello_id: boardId, name: board?.name || null }], { onConflict: 'trello_id' })
          if (boardsError) {
            console.error('[Webhook Trello] Erro ao upsert em boards:', boardsError)
          }
          const { data: boardRow } = await supabase
            .from('boards')
            .select('id')
            .eq('trello_id', boardId)
            .maybeSingle()
          boardUuidForFk = boardRow?.id || null
        } else if (looksLikeUuid(boardId)) {
          // Schema sem trello_id e com id como UUID
          const { error: boardsError } = await supabase
            .from('boards')
            .upsert([{ id: boardId, name: board?.name || null }], { onConflict: 'id' })
          if (boardsError) {
            console.error('[Webhook Trello] Erro ao upsert em boards:', boardsError)
          } else {
            boardUuidForFk = boardId
          }
        } else {
          console.warn('[Webhook Trello] Ignorando upsert em boards: boardId não é UUID compatível com schema existente')
        }
      } catch (e) {
        console.error('[Webhook Trello] Falha ao preparar board:', e)
      }
    }

    // Members (usar trello_id quando disponível; senão somente se id for UUID)
    if (hasMembers && member?.id) {
      try {
        let onConflict = 'id'
        const memberPayload: Record<string, any> = {}
        if (membersHasTrelloId) {
          memberPayload.trello_id = member.id
          onConflict = 'trello_id'
        } else if (looksLikeUuid(member.id)) {
          memberPayload.id = member.id
        } else {
          console.warn('[Webhook Trello] Ignorando upsert em members: id não-UUID e sem coluna trello_id')
        }
        if (Object.keys(memberPayload).length > 0) {
          if (membersHasUsername) memberPayload.username = member.username || null
          if (membersHasFullName) memberPayload.full_name = member.fullName || null
          else if (membersHasFullNameCamel) memberPayload.fullName = member.fullName || null
          const { error: membersError } = await supabase
            .from('members')
            .upsert([memberPayload], { onConflict })
          if (membersError) {
            console.error('[Webhook Trello] Erro ao upsert em members:', membersError)
          }
        }
      } catch (e) {
        console.error('[Webhook Trello] Falha ao upsert em members:', e)
      }
    }

    // Upsert em lists/cards para manter estado atual
    const listsToUpsert: Array<Record<string, any>> = []
    const addListForUpsert = (l: any) => {
      if (!l?.id) return
      const row: Record<string, any> = {}
      if (listsHasTrelloId) row.trello_id = l.id
      else row.id = l.id
      row.name = l.name || null
      if (listsHasBoardId && boardUuidForFk) row.board_id = boardUuidForFk
      listsToUpsert.push(row)
    }
    addListForUpsert(listFrom)
    addListForUpsert(listTo)
    // Fallback: alguns eventos trazem apenas card.idList
    const idListFallback: string | null = typeof data?.card?.idList === 'string' ? data.card.idList : null
    if (idListFallback && !listsToUpsert.some(l => (listsHasTrelloId ? l.trello_id : l.id) === idListFallback)) {
      const stub: Record<string, any> = {}
      if (listsHasTrelloId) stub.trello_id = idListFallback
      else stub.id = idListFallback
      stub.name = null
      if (listsHasBoardId && boardUuidForFk) stub.board_id = boardUuidForFk
      listsToUpsert.push(stub)
    }
    if (listsToUpsert.length > 0) {
      const { error: listsError } = await supabase.from('lists').upsert(listsToUpsert, { onConflict: listsHasTrelloId ? 'trello_id' : 'id' })
      if (listsError) {
        console.error('[Webhook Trello] Erro ao upsert em lists:', listsError)
      }
    }

    if (card?.id) {
      // Consultar card existente para não sobrescrever created_list_* se já definidos
      let existingCreatedListId: string | null = null
      let existingCreatedListTrelloId: string | null = null
      try {
        if (cardsHasCreatedListId || cardsHasCreatedListTrelloId) {
          let selector: Record<string, any> | null = null
          if (cardsHasTrelloId) selector = { trello_id: card.id }
          else if (looksLikeUuid(card.id)) selector = { id: card.id }
          if (selector) {
            const { data: existing } = await supabase
              .from('cards')
              .select('created_list_id, created_list_trello_id')
              .match(selector as any)
              .maybeSingle()
            existingCreatedListId = existing?.created_list_id ?? null
            existingCreatedListTrelloId = existing?.created_list_trello_id ?? null
          }
        }
      } catch {}
      const incomingDescription = (typeof card.desc === 'string' ? card.desc : (typeof data?.card?.desc === 'string' ? data.card.desc : null)) || null
      const updateBase: Record<string, any> = {
        name: card.name || null,
        url: (typeof card.url === 'string' ? card.url : (typeof data?.card?.url === 'string' ? data.card.url : null)) || null,
        due_at: (card?.due ? new Date(card.due).toISOString() : (data?.card?.due ? new Date(data.card.due).toISOString() : null)) || null,
      }
      if (incomingDescription && String(incomingDescription).trim().length > 0) {
        updateBase.description = incomingDescription
      }
      let onConflictCards = 'id'
      if (cardsHasTrelloId) {
        updateBase.trello_id = card.id
        onConflictCards = 'trello_id'
      } else {
        updateBase.id = card.id
      }
      if (eventType === 'create' && listTo?.id) {
        updateBase.current_list_id = listTo.id
        // Preencher também a lista de criação se existir no schema e ainda não definida
        if (cardsHasCreatedListTrelloId && !existingCreatedListTrelloId) {
          ;(updateBase as any).created_list_trello_id = listTo.id
        } else if (cardsHasCreatedListId && !existingCreatedListId) {
          ;(updateBase as any).created_list_id = listTo.id
        }
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

      // Resolver current_list_id uuid se necessário
      try {
        if (updateBase.current_list_id && listsHasTrelloId) {
          const trelloListId = updateBase.current_list_id
          const { data: listRow } = await supabase
            .from('lists')
            .select('id')
            .eq('trello_id', trelloListId)
            .maybeSingle()
          if (listRow?.id) {
            updateBase.current_list_id = listRow.id
          }
        }
      } catch {}

      // Resolver created_list_id caso tenhamos definido via trello_id como placeholder
      try {
        if ((updateBase as any).created_list_id && listsHasTrelloId) {
          const trelloListIdCreated = (updateBase as any).created_list_id
          const { data: listRow2 } = await supabase
            .from('lists')
            .select('id')
            .eq('trello_id', trelloListIdCreated)
            .maybeSingle()
          if (listRow2?.id) {
            ;(updateBase as any).created_list_id = listRow2.id
          }
        }
      } catch {}

      // Se criamos created_list_trello_id e a coluna created_list_id existe, também resolvê-la
      try {
        if ((updateBase as any).created_list_trello_id && cardsHasCreatedListId && !existingCreatedListId) {
          const trelloListIdCreated2 = (updateBase as any).created_list_trello_id
          const { data: listRow3 } = await supabase
            .from('lists')
            .select('id')
            .eq('trello_id', trelloListIdCreated2)
            .maybeSingle()
          if (listRow3?.id) {
            ;(updateBase as any).created_list_id = listRow3.id
          }
        }
      } catch {}

      // Tentar incluir board_id resolvido
      // 1) Preferir boardUuidForFk (derivado de boards via trello_id)
      let updatePayload: Record<string, any> = { ...updateBase }
      if (cardsHasBoardId && boardUuidForFk) {
        updatePayload.board_id = boardUuidForFk
      } else if (cardsHasBoardId) {
        // 2) Se boardId é UUID nativo
        if (boardId && looksLikeUuid(boardId)) {
          updatePayload.board_id = boardId
        } else if (updateBase.current_list_id && listsHasBoardId) {
          // 3) Buscar board_id a partir da lista atual
          try {
            const listKey = listsHasTrelloId ? { trello_id: data?.card?.idList || listTo?.id || listFrom?.id } : { id: updateBase.current_list_id }
            const { data: listWithBoard } = await supabase
              .from('lists')
              .select('board_id')
              .match(listKey as any)
              .maybeSingle()
            if (listWithBoard?.board_id) {
              updatePayload.board_id = listWithBoard.board_id
            }
          } catch {}
        }
      }
      // Se for criação de card, tentar definir created_by_member_id a partir do memberCreator
      if (eventType === 'create' && member?.id) {
        try {
          const { data: createdBy } = await supabase
            .from('members')
            .select('id')
            .eq('trello_id', member.id)
            .maybeSingle()
          if (createdBy?.id) {
            updatePayload.created_by_member_id = createdBy.id
          }
        } catch {}
      }

      let { error: cardsError } = await supabase.from('cards').upsert([updatePayload], { onConflict: onConflictCards })
      if (cardsError && (cardsHasBoardId || cardsHasTrelloId)) {
        // Fallback: tenta sem board_id, mantendo chave de conflito
        const fallback: Record<string, any> = { ...updateBase }
        let { error: cardsErrorFallback } = await supabase.from('cards').upsert([fallback], { onConflict: onConflictCards })
        if (cardsErrorFallback) {
          console.error('[Webhook Trello] Erro ao upsert em cards (fallback também falhou):', cardsErrorFallback, { update: updateBase })
        }
      } else if (cardsError) {
        console.error('[Webhook Trello] Erro ao upsert em cards:', cardsError, { update: updatePayload })
      }
    }

    // Registrar movimentações explícitas usando função RPC (idempotente por trello_action_id)
    if (eventType === 'move' || eventType === 'create') {
      try {
        const toListId: string | null = listTo?.id || (typeof data?.card?.idList === 'string' ? data.card.idList : null) || null
        if (card?.id && toListId) {
          const { error: moveErr } = await supabase.rpc('fn_set_card_list_by_trello', {
            p_card_trello_id: card.id,
            p_to_list_trello_id: toListId,
            p_moved_by_member_trello_id: member?.id || null,
            p_moved_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
            p_trello_action_id: action.id,
          } as any)
          if (moveErr) {
            console.error('[Webhook Trello] Erro ao registrar movimentação (RPC):', moveErr)
          }
        }
      } catch (movementError) {
        console.warn('[Webhook Trello] Falha ao chamar RPC de movimentação:', movementError)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook do Trello:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Erro interno', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}


