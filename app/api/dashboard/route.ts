import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Lê período opcional (?from=...&to=...)
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Buscar dados das views do dashboard (sem cache e com paginação ampla quando necessário)
    const commonOptions: RequestInit = {
      // Evita qualquer cache do Next.js ou do fetch
      cache: 'no-store' as RequestCache,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        // Habilita contagem exata quando aplicável
        'Prefer': 'count=exact'
      }
    }

    const rangeOptions = (from = 0, to = 999999): RequestInit => ({
      ...commonOptions,
      headers: {
        ...(commonOptions.headers as Record<string, string>),
        'Range-Unit': 'items',
        'Range': `${from}-${to}`
      }
    })

    // Helper para paginação
    const fetchAll = async (pathWithQuery: string) => {
      const pageSize = 1000
      let start = 0
      const acc: any[] = []
      while (true) {
        const end = start + pageSize - 1
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
          ...commonOptions,
          headers: {
            ...(commonOptions.headers as Record<string, string>),
            Range: `${start}-${end}`,
          },
        })
        if (!res.ok) throw new Error(`Falha ao consultar ${pathWithQuery} [${start}-${end}]`)
        const batch = await res.json()
        acc.push(...batch)
        if (!Array.isArray(batch) || batch.length < pageSize) break
        start += pageSize
      }
      return acc
    }

    // Se não houver período, mantemos as views agregadas padrão (estado atual do quadro)
    let listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse, openCardsResponse, archivedCountResponse
    if (!from || !to) {
      ;[listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse, openCardsResponse, archivedCountResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_lists?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_act_types?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_breakdown?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_pivot?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_summary?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_total_cards?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/open_cards?select=*`, rangeOptions(0, 999999)),
        // Apenas para obter a contagem de arquivados atuais (is_closed = true)
        fetch(`${SUPABASE_URL}/rest/v1/cards?select=id&is_closed=eq.true`, rangeOptions(0, 0))
      ])
    } else {
      // Reconstruir estado de cards com eventos até 'to' e determinar quais existiram no período [from, to]
      const fromDate = new Date(from)
      const toDate = new Date(to)

      const eventsAll: Array<any> = await fetchAll(
        `member_activity?select=card_id,action_type,occurred_at,from_list_id,from_list_name,to_list_id,to_list_name,act_type&occurred_at=lte.${encodeURIComponent(to)}&order=occurred_at.asc`
      )
      const eventsByCard = new Map<string, Array<any>>()
      for (const e of eventsAll) {
        if (!e.card_id) continue
        if (!eventsByCard.has(e.card_id)) eventsByCard.set(e.card_id, [])
        eventsByCard.get(e.card_id)!.push(e)
      }

      // Buscar listas antecipadamente para usar metadados e IDs alvo (entrada/triagem)
      // Buscar listas. Tentamos incluir trello_id (quando existir) para mapear created_list_trello_id -> id
      let listsAll: Array<any> = []
      {
        const listsResTry = await fetch(`${SUPABASE_URL}/rest/v1/lists?select=id,trello_id,name,pos,closed`, commonOptions)
        if (listsResTry.ok) {
          listsAll = (await listsResTry.json()) as Array<any>
        } else {
          const listsResFallback = await fetch(`${SUPABASE_URL}/rest/v1/lists?select=id,name,pos,closed`, commonOptions)
          if (!listsResFallback.ok) throw new Error('Falha ao buscar listas')
          listsAll = (await listsResFallback.json()) as Array<any>
        }
      }
      const listMetaById = new Map<string, { name: string; pos: number; trello_id?: string | null }>()
      const listIdByTrelloId = new Map<string, string>()
      for (const l of listsAll) {
        listMetaById.set(l.id, { name: l.name, pos: l.pos, trello_id: l.trello_id ?? null })
        if (l.trello_id) listIdByTrelloId.set(String(l.trello_id), String(l.id))
      }
      const entryTriageIds = new Set<string>()
      const DEFAULT_ENTRY_TRIAGE = ['6866abc12d1dd317b1f980b0', '67e44cc54b8865ef73dcaca6']
      const envEntryTriagRaw = process.env.DASH_ENTRY_TRIAGE_LIST_IDS || DEFAULT_ENTRY_TRIAGE.join(',')
      const envEntryTriage = envEntryTriagRaw.split(',').map((s) => s.trim()).filter(Boolean)
      if (envEntryTriage.length > 0) {
        for (const id of envEntryTriage) entryTriageIds.add(id)
      } else {
        // Fallback por nome, apenas para descobrir os IDs uma vez
        for (const l of listsAll) {
          const nm = String(l.name || '').toLowerCase()
          if (nm.includes('entrada') || nm.includes('triagem')) entryTriageIds.add(l.id)
        }
      }

      const existedCardIds = new Set<string>()
      const openedSet = new Set<string>()
      // Conjunto de cards criados no período (independente da lista)
      const createdSet = new Set<string>()
      // Mantemos o conjunto de "tocou Entrada/Triagem" apenas para análises específicas
      const createdEntrySet = new Set<string>()
      const archivedSet = new Set<string>()
      const concludedSet = new Set<string>()
      const openAtToSet = new Set<string>()
      const listAtTo = new Map<string, { id: string | null; name: string | null }>()
      const createdListByCardFromEvents = new Map<string, { id: string | null; name: string | null }>()

      for (const [cardId, evts] of Array.from(eventsByCard.entries())) {
        let openState = false
        let openAtFrom = false
        let currentListId: string | null = null
        let currentListName: string | null = null
        let sawBeforeFrom = false
        let openedWithin = false
        let createdWithin = false
        let touchedEntryOrTriageWithin = false
        let archivedWithin = false
        let concludedWithin = false
        for (const e of evts) {
          const at = new Date(e.occurred_at)
          // aplicar mudança de lista primeiro
          const isCreateEvent = (e.action_type === 'create' || e.action_type === 'createCard' || e.action_type === 'copyCard' || e.action_type === 'convertToCardFromCheckItem')
          if (isCreateEvent || e.action_type === 'move' || e.action_type === 'unarchive') {
            if (e.to_list_id) {
              currentListId = e.to_list_id
              currentListName = e.to_list_name
            }
          }
          // aplicar estado de aberto/fechado
          if (isCreateEvent || e.action_type === 'unarchive') {
            openState = true
          } else if (e.action_type === 'archive' || e.action_type === 'delete') {
            openState = false
          }
          if (at < fromDate) {
            openAtFrom = openState
            sawBeforeFrom = true
          } else if (at >= fromDate && at <= toDate) {
            if (isCreateEvent || e.action_type === 'unarchive') openedWithin = true
            if (isCreateEvent) {
              createdWithin = true
              createdSet.add(cardId)
              if (!createdListByCardFromEvents.has(cardId)) {
                createdListByCardFromEvents.set(cardId, { id: e.to_list_id || null, name: e.to_list_name || null })
              }
            }
            if ((isCreateEvent || e.action_type === 'move' || e.action_type === 'unarchive') && e.to_list_id) {
              if (entryTriageIds.has(e.to_list_id)) {
                touchedEntryOrTriageWithin = true
              }
              // Fallback extra por nome (resiliência)
              if (!touchedEntryOrTriageWithin) {
                const nm = String(e.to_list_name || '').toLowerCase()
                if (nm.includes('entrada') || nm.includes('triagem')) touchedEntryOrTriageWithin = true
              }
            }
            // Considera transições que definem is_closed = true no período
            if (e.action_type === 'archive' || e.action_type === 'delete') archivedWithin = true
            // Conclusão: entrada na lista "Concluídos" durante o período
            if (isCreateEvent || e.action_type === 'move' || e.action_type === 'unarchive') {
              const toNameLc = String(e.to_list_name || '').toLowerCase()
              if (toNameLc.includes('conclu')) {
                concludedWithin = true
              }
            }
          }
        }
        // Se não havia evento até 'from', aproximação: se primeiro evento é create, não estava aberto em 'from'; senão, estava aberto
        if (!sawBeforeFrom && evts.length > 0) {
          const firstEvt = evts[0]
          const firstAt = new Date(firstEvt.occurred_at)
          if (firstAt > fromDate) {
            openAtFrom = firstEvt.action_type === 'create' ? false : true
          }
        }
        const openAtTo = openState
        if (openAtFrom || openedWithin) {
          existedCardIds.add(cardId)
        }
        if (openedWithin) openedSet.add(cardId)
        if (createdWithin && touchedEntryOrTriageWithin) createdEntrySet.add(cardId)
        if (archivedWithin) archivedSet.add(cardId)
        if (concludedWithin) concludedSet.add(cardId)
        if (openAtTo) openAtToSet.add(cardId)
        listAtTo.set(cardId, { id: currentListId, name: currentListName })
      }

      // Buscar detalhes dos cards que existiram no período
      const fetchCardsByIds = async (ids: string[], includeCreatedCols: boolean): Promise<Array<any>> => {
        if (ids.length === 0) return []
        const chunkSize = 200
        const results: any[] = []
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize)
          const inList = `(${chunk.map((id) => `"${id}"`).join(',')})`
          const base = 'id,name,act_type,act_value,clerk_name,current_list_id,is_closed'
          const select = includeCreatedCols ? `${base},created_list_id,created_list_trello_id` : base
          const res = await fetch(`${SUPABASE_URL}/rest/v1/cards?select=${select}&id=in.${encodeURIComponent(inList)}`, commonOptions)
          if (!res.ok) throw new Error('Falha ao buscar detalhes dos cards')
          results.push(...(await res.json()))
        }
        return results
      }

      const existedIdsArr = Array.from(existedCardIds)
      let cardsDetails: any[] = []
      let createdColsAvailable = true
      try {
        cardsDetails = await fetchCardsByIds(existedIdsArr, true)
      } catch (e) {
        createdColsAvailable = false
        cardsDetails = await fetchCardsByIds(existedIdsArr, false)
      }
      const cardById = new Map<string, any>(cardsDetails.map((c: any) => [c.id, c]))

      // Metadados de listas já carregados acima

      // Overall
      const overall: any = {
        total_cards: existedCardIds.size,
        cards_with_act_type: 0,
        cards_without_act_type: 0,
        cards_with_clerk: 0,
        cards_with_value: 0,
        total_value: 0,
        cards_needing_reconference: 0,
        // Cards abertos: todos os que estiveram abertos no período e NÃO chegaram à lista Concluídos no período
        opened_cards: Math.max(0, existedCardIds.size - concludedSet.size),
        archived_cards: archivedSet.size,
        completed_cards: concludedSet.size,
        // Em andamento: no fim do período, abertos e que não chegaram em Concluídos no período
        in_progress_cards: Array.from(openAtToSet).filter((id) => existedCardIds.has(id) && !concludedSet.has(id)).length,
      }
      for (const id of Array.from(existedCardIds)) {
        const c = cardById.get(id)
        if (c?.act_type) overall.cards_with_act_type += 1
        else overall.cards_without_act_type += 1
        if (c?.clerk_name) overall.cards_with_clerk += 1
        if (typeof c?.act_value === 'number') {
          overall.cards_with_value += 1
          overall.total_value += c.act_value || 0
        }
      }

      // Aggregações por lista (usar lista conhecida até 'to' ou metadados)
      const listAgg = new Map<string, { id: string; name: string; position: number; total_cards: number; cards_with_act_type: number; cards_without_act_type: number }>()
      for (const id of Array.from(existedCardIds)) {
        const listInfo = listAtTo.get(id)
        const listId = (listInfo?.id as string) || cardById.get(id)?.current_list_id || 'unknown'
        const meta = listId && listMetaById.get(listId)
        const name = listInfo?.name || meta?.name || '—'
        const position = meta?.pos ?? 999999
        if (!listAgg.has(listId)) listAgg.set(listId, { id: listId, name, position, total_cards: 0, cards_with_act_type: 0, cards_without_act_type: 0 })
        const a = listAgg.get(listId)!
        a.total_cards += 1
        const c = cardById.get(id)
        if (c?.act_type) a.cards_with_act_type += 1
        else a.cards_without_act_type += 1
      }
      const lists = Array.from(listAgg.values()).sort((a, b) => a.position - b.position)

      // act_types
      const actTypeCount = new Map<string, number>()
      for (const id of Array.from(existedCardIds)) {
        const c = cardById.get(id)
        const name = c?.act_type || 'Não definido'
        actTypeCount.set(name, (actTypeCount.get(name) || 0) + 1)
      }
      const actTypes = Array.from(actTypeCount.entries())
        .map(([name, total_count]) => ({ name, total_count, active_cards: 0, total_value: 0 }))
        .sort((a, b) => b.total_count - a.total_count)

      // created_act_types: cards criados no período (baseado em eventos 'create')
      const createdActTypeCount = new Map<string, number>()
      for (const id of Array.from(createdSet)) {
        if (!existedCardIds.has(id)) continue
        const c = cardById.get(id)
        const name = c?.act_type || 'Não definido'
        createdActTypeCount.set(name, (createdActTypeCount.get(name) || 0) + 1)
      }
      const createdActTypes = Array.from(createdActTypeCount.entries())
        .map(([name, total_count]) => ({ name, total_count, active_cards: 0, total_value: 0 }))
        .sort((a, b) => b.total_count - a.total_count)

      // created_by_list: distribuição por lista de criação (preferir created_list_*; fallback ao evento 'create')
      const createdByListCount = new Map<string, { list_id: string; list_name: string; list_position: number; total_created: number }>()
      if (createdColsAvailable) {
        for (const id of Array.from(createdSet)) {
          if (!existedCardIds.has(id)) continue
          const c = cardById.get(id)
          if (!c) continue
          let listId: string | null = c.created_list_id || null
          if (!listId && c.created_list_trello_id) {
            const mapped = listIdByTrelloId.get(String(c.created_list_trello_id))
            if (mapped) listId = mapped
          }
          const meta = listId ? listMetaById.get(listId) : null
          const effectiveListId = listId || `name:${String(meta?.name || '—')}`
          const listName = meta?.name || '—'
          const listPosition = meta?.pos ?? 999999
          if (!createdByListCount.has(effectiveListId)) {
            createdByListCount.set(effectiveListId, { list_id: effectiveListId, list_name: listName, list_position: listPosition, total_created: 0 })
          }
          createdByListCount.get(effectiveListId)!.total_created += 1
        }
      } else {
        for (const id of Array.from(createdSet)) {
          if (!existedCardIds.has(id)) continue
          const info = createdListByCardFromEvents.get(id)
          const toListId = info?.id || null
          const toListName = info?.name || null
          let listId: string | null = null
          if (toListId) {
            if (listMetaById.has(toListId)) listId = toListId
            if (!listId) listId = listIdByTrelloId.get(String(toListId)) || null
          }
          const meta = listId ? listMetaById.get(listId) : null
          const effectiveListId = listId || `name:${String(toListName || meta?.name || '—')}`
          const listName = meta?.name || toListName || '—'
          const listPosition = meta?.pos ?? 999999
          if (!createdByListCount.has(effectiveListId)) {
            createdByListCount.set(effectiveListId, { list_id: effectiveListId, list_name: listName, list_position: listPosition, total_created: 0 })
          }
          createdByListCount.get(effectiveListId)!.total_created += 1
        }
      }
      const createdByList = Array.from(createdByListCount.values()).sort((a, b) => a.list_position - b.list_position)

      // breakdown por lista e tipo de ato
      const breakdownMap = new Map<string, any>()
      for (const id of Array.from(existedCardIds)) {
        const listInfo = listAtTo.get(id)
        const listId = (listInfo?.id as string) || cardById.get(id)?.current_list_id || 'unknown'
        const meta = listId && listMetaById.get(listId)
        const listName = listInfo?.name || meta?.name || '—'
        const listPos = meta?.pos ?? 999999
        const act = cardById.get(id)?.act_type || 'Não definido'
        const key = `${listId}__${act}`
        if (!breakdownMap.has(key)) breakdownMap.set(key, { list_id: listId, list_name: listName, list_position: listPos, total_cards_in_list: 0, unique_act_types: 0, classified_cards: 0, unclassified_cards: 0, completion_percentage: 0, act_type_name: act, cards_count: 0, total_value: 0 })
        const agg = breakdownMap.get(key)
        agg.cards_count += 1
      }
      const breakdown = Array.from(breakdownMap.values()).sort((a, b) => a.list_position - b.list_position || b.cards_count - a.cards_count)

      // pivot por lista
      const pivotMap = new Map<string, any>()
      for (const id of Array.from(existedCardIds)) {
        const listInfo = listAtTo.get(id)
        const listId = (listInfo?.id as string) || cardById.get(id)?.current_list_id || 'unknown'
        const meta = listMetaById.get(listId)
        const listName = listInfo?.name || meta?.name || '—'
        const listPos = meta?.pos ?? 999999
        if (!pivotMap.has(listName)) pivotMap.set(listName, { list_name: listName, list_position: listPos, total_cards: 0 })
        const row = pivotMap.get(listName)
        row.total_cards += 1
        const act = cardById.get(id)?.act_type || 'Não definido'
        row[act] = (row[act] || 0) + 1
      }
      const pivot = Array.from(pivotMap.values())
      for (const row of pivot) {
        const totalClass = Object.entries(row).reduce((sum, [k, v]) => (k !== 'list_name' && k !== 'list_position' && k !== 'total_cards' && k !== 'Não definido' ? sum + (v as number) : sum), 0)
        row['Total Classificados'] = totalClass
        row['Percentual Classificados'] = row.total_cards ? Math.round((totalClass / row.total_cards) * 100) : 0
      }

      // summary
      const summary = lists.map((l) => ({
        list_name: l.name,
        list_position: l.position,
        total_cards: l.total_cards,
        classified_cards: l.cards_with_act_type,
        unclassified_cards: l.cards_without_act_type,
        unique_act_types: 0,
        completion_percentage: l.total_cards ? Math.round((l.cards_with_act_type / l.total_cards) * 100) : 0,
        status: l.cards_with_act_type === 0 ? 'Pendente' : l.cards_without_act_type === 0 ? 'Completa' : 'Parcial',
      }))

      // open_cards: cards abertos em 'to'
      const openCards: Array<any> = []
      for (const id of Array.from(openAtToSet)) {
        if (!existedCardIds.has(id)) continue
        const c = cardById.get(id)
        const listInfo = listAtTo.get(id)
        const listId = (listInfo?.id as string) || c?.current_list_id || null
        const meta = listId ? listMetaById.get(listId) : null
        openCards.push({
          id,
          name: c?.name || id,
          act_type: c?.act_type || null,
          act_value: c?.act_value ?? null,
          clerk_name: c?.clerk_name || null,
          current_list_id: listId,
          list_name: listInfo?.name || meta?.name || null,
          list_position: meta?.pos ?? null,
        })
      }

      return NextResponse.json({
        overall,
        lists,
        act_types: actTypes,
        created_act_types: createdActTypes,
        created_by_list: createdByList,
        breakdown,
        pivot,
        summary,
        open_cards: openCards,
        _debug: { source_url: SUPABASE_URL, key_tail: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(-8) : null, period: { from, to }, entry_triage_ids: Array.from(entryTriageIds) },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!listsResponse.ok || !actTypesResponse.ok || !breakdownResponse.ok || !pivotResponse.ok || !summaryResponse.ok || !totalCardsResponse.ok || !openCardsResponse.ok || !archivedCountResponse.ok) {
      throw new Error('Erro ao buscar dados do Supabase')
    }

    const [lists, actTypes, breakdown, pivot, summary, totalCards, openCards] = await Promise.all([
      listsResponse.json(),
      actTypesResponse.json(),
      breakdownResponse.json(),
      pivotResponse.json(),
      summaryResponse.json(),
      totalCardsResponse.json(),
      openCardsResponse.json()
    ])

    // Usar os dados da nova view para estatísticas gerais
    const overall = totalCards[0] || {
      total_cards: 0,
      cards_with_act_type: 0,
      cards_without_act_type: 0,
      cards_with_clerk: 0,
      cards_with_value: 0,
      total_value: 0,
      cards_needing_reconference: 0
    }

    // Adiciona contagem de arquivados atuais (is_closed = true)
    const contentRange = archivedCountResponse.headers.get('Content-Range') || archivedCountResponse.headers.get('content-range')
    if (contentRange) {
      const totalMatch = contentRange.match(/\/(\d+)$/)
      const totalArchived = totalMatch ? parseInt(totalMatch[1], 10) : 0
      ;(overall as any).archived_cards = totalArchived
    } else {
      ;(overall as any).archived_cards = 0
    }

    // Adiciona contagem de abertos atuais (is_closed = false)
    const openContentRange = openCardsResponse.headers.get('Content-Range') || openCardsResponse.headers.get('content-range')
    if (openContentRange) {
      const totalMatch = openContentRange.match(/\/(\d+)$/)
      const totalOpen = totalMatch ? parseInt(totalMatch[1], 10) : (Array.isArray(openCards) ? openCards.length : 0)
      ;(overall as any).opened_cards = totalOpen
    } else {
      ;(overall as any).opened_cards = Array.isArray(openCards) ? openCards.length : 0
    }

    return NextResponse.json({
      overall,
      lists,
      act_types: actTypes,
      breakdown,
      pivot,
      summary,
      open_cards: openCards,
      // Campo de depuração para verificar o projeto Supabase de origem
      _debug: {
        source_url: SUPABASE_URL,
        key_tail: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(-8) : null
      }
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (error) {
    console.error('Erro na API do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
