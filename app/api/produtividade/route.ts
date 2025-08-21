import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Configuração do Supabase não encontrada' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // 1) Descobrir quais cards estavam abertos em ALGUM momento do período [from, to]
    //    usando created_at de cards + eventos de archive/unarchive até 'to'
    if (!from || !to) {
      return NextResponse.json({ rows: [], overview: [], byActType: [], flows: [] })
    }

    // Helper para buscar todas as páginas (PostgREST tem limite padrão de 1000 linhas por request)
    const fetchAll = async (pathWithQuery: string, pageSizeOverride?: number) => {
      const pageSize = pageSizeOverride && pageSizeOverride > 0 ? pageSizeOverride : 1000
      let start = 0
      const acc: any[] = []
      // Usa Prefer: count=exact para garantir Content-Range está presente; mas iteramos pelo tamanho da página retornada
      while (true) {
        const end = start + pageSize - 1
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'count=exact',
            Range: `${start}-${end}`,
          },
        })
        if (!res.ok) {
          let body = ''
          try { body = await res.text() } catch {}
          console.error('PostgREST error', { status: res.status, path: pathWithQuery, range: `${start}-${end}`, body: body?.slice?.(0, 500) })
          throw new Error(`Falha ao consultar ${pathWithQuery} [${start}-${end}]`)
        }
        const batch = await res.json()
        acc.push(...batch)
        if (!Array.isArray(batch) || batch.length < pageSize) break
        start += pageSize
      }
      return acc
    }

    // Buscar todos os eventos até "to"; tenta a view e faz fallback para tabelas base se necessário
    let allEvents: Array<{ card_id: string | null; action_type: string; occurred_at: string }> = []
    try {
      allEvents = await fetchAll(
        `member_activity_fast?select=trello_action_id,card_id,action_type,occurred_at&occurred_at=lte.${encodeURIComponent(to)}&order=occurred_at.asc`,
        500
      )
    } catch {
      console.warn('[produtividade] Fallback para tabelas base (member_activity timeout)')
      const tryFetchBase = async (table: string, tsCol: string, orderCol: string): Promise<any[]> => {
        return await fetchAll(`${table}?select=*&${tsCol}=lte.${encodeURIComponent(to)}&order=${orderCol}.asc`, 500)
      }
      const fetchCardEventsBase = async (): Promise<any[]> => {
        const attempts: Array<[string, string]> = [
          ['occurred_at', 'occurred_at'],
          ['created_at', 'created_at'],
          ['inserted_at', 'inserted_at'],
        ]
        for (const [ts, order] of attempts) {
          try { return await tryFetchBase('card_events', ts, order) } catch {}
        }
        return []
      }
      const fetchMovementsBase = async (): Promise<any[]> => {
        const attempts: Array<[string, string]> = [
          ['moved_at', 'moved_at'],
          ['occurred_at', 'occurred_at'],
          ['created_at', 'created_at'],
          ['inserted_at', 'inserted_at'],
        ]
        for (const [ts, order] of attempts) {
          try { return await tryFetchBase('card_movements', ts, order) } catch {}
        }
        return []
      }
      const [ceRaw, mvRaw] = await Promise.all([fetchCardEventsBase(), fetchMovementsBase()])
      const ceNorm = ceRaw.map((r: any) => ({
        card_id: r.card_id || r.card_uuid || r.card_trello_id || null,
        action_type: String(r.action_type || '').toLowerCase() === 'createcard' || String(r.action_type || '').toLowerCase() === 'copycard' || String(r.action_type || '').toLowerCase() === 'converttocardfromcheckitem' ? 'create'
          : (String(r.action_type || '').toLowerCase() === 'updatecard' && (r.list_before_id || r.list_after_id)) ? 'move'
          : (r.action_type || 'update'),
        occurred_at: r.occurred_at || r.created_at || r.inserted_at,
      }))
      const mvNorm = mvRaw.map((m: any) => ({
        card_id: m.card_id || m.card_uuid || m.card_trello_id || null,
        action_type: m.action_type || 'move',
        occurred_at: m.moved_at || m.occurred_at || m.created_at || m.inserted_at,
      }))
      allEvents = [...ceNorm, ...mvNorm].filter((e) => e.card_id && e.occurred_at)
      allEvents.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)
    const eventsByCard = new Map<string, Array<{ type: string; at: Date }>>()
    // Deduplicar eventos por trello_action_id (quando existir)
    const seenEv = new Set<string>()
    for (const e of allEvents) {
      const evKey = (e as any).trello_action_id || `${e.card_id}:${e.action_type}:${e.occurred_at}`
      if (seenEv.has(evKey)) continue
      seenEv.add(evKey)
      if (!e.card_id) continue
      if (!eventsByCard.has(e.card_id)) eventsByCard.set(e.card_id, [])
      eventsByCard.get(e.card_id)!.push({ type: e.action_type, at: new Date(e.occurred_at) })
    }
    Array.from(eventsByCard.values()).forEach((arr) => arr.sort((a, b) => a.at.getTime() - b.at.getTime()))

    const openCardIds = new Set<string>()
    Array.from(eventsByCard.entries()).forEach(([cardId, evts]) => {
      if (evts.length === 0) return
      const firstEvt = evts[0]
      let openAtFrom = false
      if (firstEvt.at > fromDate) {
        // não existia evento até 'from': se o primeiro evento é 'create', então estava fechado em 'from';
        // se é 'move' ou 'unarchive', assumimos que já estava aberto em 'from'
        openAtFrom = firstEvt.type === 'create' ? false : true
      } else {
        // reproduz estado até 'from'
        for (const e of evts) {
          if (e.at <= fromDate) {
            if (e.type === 'create' || e.type === 'unarchive') openAtFrom = true
            if (e.type === 'archive' || e.type === 'delete') openAtFrom = false
          } else {
            break
          }
        }
      }
      if (openAtFrom) {
        openCardIds.add(cardId)
        return
      }
      // Caso contrário, se abriu em algum momento dentro da janela
      for (const e of evts) {
        if (e.at > fromDate && e.at <= toDate) {
          if (e.type === 'create' || e.type === 'unarchive') {
            openCardIds.add(cardId)
            break
          }
        }
      }
    })

    // 2) Buscar atividades dentro do período e filtrar pelos cards abertos na janela
    const filters: string[] = []
    if (from) filters.push(`occurred_at=gte.${encodeURIComponent(from)}`)
    if (to) filters.push(`occurred_at=lte.${encodeURIComponent(to)}`)
    const queryString = filters.length ? `&${filters.join('&')}` : ''

    let rawRows: any[] = []
    try {
      const path = `member_activity_fast?select=occurred_at,trello_action_id,card_id,action_type,member_id,member_username,member_fullname,from_list_id,from_list_name,to_list_id,to_list_name,act_type${queryString}&order=occurred_at.asc`
      rawRows = await fetchAll(path, 500)
    } catch {
      console.warn('[produtividade] Fallback rows por período via tabelas base')
      const tryFetchRange = async (table: string, tsCol: string, orderCol: string): Promise<any[]> => {
        const filters: string[] = []
        if (from) filters.push(`${tsCol}=gte.${encodeURIComponent(from)}`)
        if (to) filters.push(`${tsCol}=lte.${encodeURIComponent(to)}`)
        const qs = filters.length ? `&${filters.join('&')}` : ''
        return await fetchAll(`${table}?select=*&order=${orderCol}.asc${qs}`, 500)
      }
      const fetchCardEventsRange = async (): Promise<any[]> => {
        const attempts: Array<[string, string]> = [
          ['occurred_at', 'occurred_at'],
          ['created_at', 'created_at'],
          ['inserted_at', 'inserted_at'],
        ]
        for (const [ts, order] of attempts) {
          try { return await tryFetchRange('card_events', ts, order) } catch {}
        }
        return []
      }
      const fetchMovementsRange = async (): Promise<any[]> => {
        const attempts: Array<[string, string]> = [
          ['moved_at', 'moved_at'],
          ['occurred_at', 'occurred_at'],
          ['created_at', 'created_at'],
          ['inserted_at', 'inserted_at'],
        ]
        for (const [ts, order] of attempts) {
          try { return await tryFetchRange('card_movements', ts, order) } catch {}
        }
        return []
      }
      const [ceR, mvR] = await Promise.all([fetchCardEventsRange(), fetchMovementsRange()])
      const ceNorm = ceR.map((r: any) => ({
        occurred_at: r.occurred_at || r.created_at || r.inserted_at,
        trello_action_id: r.trello_action_id || null,
        card_id: r.card_id || r.card_uuid || r.card_trello_id || null,
        action_type: String(r.action_type || '').toLowerCase() === 'createcard' || String(r.action_type || '').toLowerCase() === 'copycard' || String(r.action_type || '').toLowerCase() === 'converttocardfromcheckitem' ? 'create'
          : (String(r.action_type || '').toLowerCase() === 'updatecard' && (r.list_before_id || r.list_after_id)) ? 'move'
          : (r.action_type || 'update'),
        member_id: r.member_id || null,
        member_username: r.member_username || null,
        member_fullname: r.member_fullname || null,
        from_list_id: r.from_list_id || r.from_list_uuid || r.from_list_trello_id || r.list_before_id || null,
        from_list_name: r.from_list_name || null,
        to_list_id: r.to_list_id || r.to_list_uuid || r.to_list_trello_id || r.list_after_id || r.list_id || null,
        to_list_name: r.to_list_name || null,
        act_type: r.act_type || null,
      }))
      const mvNorm = mvR.map((m: any) => ({
        occurred_at: m.moved_at || m.occurred_at || m.created_at || m.inserted_at,
        trello_action_id: null,
        card_id: m.card_id || m.card_uuid || m.card_trello_id || null,
        action_type: m.action_type || 'move',
        member_id: m.moved_by_member_id || m.member_id || null,
        member_username: m.member_username || null,
        member_fullname: m.member_fullname || null,
        from_list_id: m.from_list_id || m.from_list_uuid || m.from_list_trello_id || null,
        from_list_name: m.from_list_name || null,
        to_list_id: m.to_list_id || m.to_list_uuid || m.to_list_trello_id || null,
        to_list_name: m.to_list_name || null,
        act_type: m.act_type || null,
      }))
      rawRows = [...ceNorm, ...mvNorm].filter((r) => r.card_id && r.occurred_at)
      rawRows.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    }
    // Mostrar registros do período para TODOS os cards abertos na janela (não apenas os que têm evento no período)
    // e filtrar somente interações de produtividade (criação ou movimentação real entre listas distintas)
    const isValidMove = (r: any) => {
      if (r.action_type !== 'move') return false
      const fromId = r.from_list_id
      const toId = r.to_list_id
      const fromName = r.from_list_name
      const toName = r.to_list_name
      if (fromId && toId) return fromId !== toId
      if (fromName && toName) return fromName !== toName
      return false
    }
    const isProductiveEvent = (r: any) => r.action_type === 'create' || isValidMove(r)
    const rows = rawRows
      .filter((r) => r.card_id && openCardIds.has(r.card_id))
      .filter(isProductiveEvent)

    // Aggregations inspired by docs/produtividade_views.md
    type Row = {
      occurred_at: string
      action_type: string
      member_id: string | null
      member_username: string | null
      member_fullname: string | null
      from_list_id: string | null
      from_list_name: string | null
      to_list_id: string | null
      to_list_name: string | null
      act_type: string | null
    }

    // 1) prod_member_overview
    const overviewMap = new Map<string, any>()
    for (const r of rows as Row[]) {
      const key = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      if (!overviewMap.has(key)) {
        overviewMap.set(key, {
          member_id: r.member_id,
          member_username: r.member_username || '-',
          member_fullname: r.member_fullname || 'Desconhecido',
          total_actions: 0,
          created: 0,
          moved: 0,
          archived: 0,
          unarchived: 0,
          deleted: 0,
          first_action_at: r.occurred_at,
          last_action_at: r.occurred_at,
        })
      }
      const agg = overviewMap.get(key)
      agg.total_actions += 1
      if (r.action_type === 'create') agg.created += 1
      else if (r.action_type === 'move') agg.moved += 1
      if (r.occurred_at < agg.first_action_at) agg.first_action_at = r.occurred_at
      if (r.occurred_at > agg.last_action_at) agg.last_action_at = r.occurred_at
    }
    const overview = Array.from(overviewMap.values()).sort((a, b) => b.total_actions - a.total_actions)

    // 2) prod_member_by_act_type
    const byKeyActMap = new Map<string, any>()
    for (const r of rows as Row[]) {
      const memberKey = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      const act = r.act_type || 'Não definido'
      const compKey = `${memberKey}__${act}`
      if (!byKeyActMap.has(compKey)) {
        byKeyActMap.set(compKey, {
          member_id: r.member_id,
          member_username: r.member_username || '-',
          member_fullname: r.member_fullname || 'Desconhecido',
          act_type_name: act,
          created: 0,
          moved: 0,
          total_actions: 0,
        })
      }
      const agg = byKeyActMap.get(compKey)
      if (r.action_type === 'create') agg.created += 1
      if (r.action_type === 'move') agg.moved += 1
      agg.total_actions += 1
    }
    const byActType = Array.from(byKeyActMap.values()).sort((a, b) => b.total_actions - a.total_actions)

    // 3) prod_member_flows (only moves)
    const flowsKeyMap = new Map<string, any>()
    for (const r of rows as Row[]) {
      if (r.action_type !== 'move') continue
      // garantir movimentação real entre listas diferentes
      const fromId = r.from_list_id
      const toId = r.to_list_id
      const fromNameRaw = r.from_list_name || r.from_list_id || '—'
      const toNameRaw = r.to_list_name || r.to_list_id || '—'
      if ((fromId && toId && fromId === toId) || (!fromId && !toId && fromNameRaw === toNameRaw)) continue
      const memberKey = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      const fromName = fromNameRaw
      const toName = toNameRaw
      const act = r.act_type || 'Não definido'
      const compKey = `${memberKey}__${fromName}__${toName}__${act}`
      if (!flowsKeyMap.has(compKey)) {
        flowsKeyMap.set(compKey, {
          member_id: r.member_id,
          member_username: r.member_username || '-',
          member_fullname: r.member_fullname || 'Desconhecido',
          from_list_name: fromName,
          to_list_name: toName,
          act_type_name: act,
          moved: 0,
        })
      }
      const agg = flowsKeyMap.get(compKey)
      agg.moved += 1
    }
    const flows = Array.from(flowsKeyMap.values()).sort((a, b) => b.moved - a.moved)

    return NextResponse.json({ rows, overview, byActType, flows })
  } catch (e) {
    console.error('Erro em /api/produtividade:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}



