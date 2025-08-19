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
    let listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse, openCardsResponse
    if (!from || !to) {
      ;[listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse, openCardsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_lists?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_act_types?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_breakdown?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_pivot?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_summary?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/dashboard_total_cards?select=*`, commonOptions),
        fetch(`${SUPABASE_URL}/rest/v1/open_cards?select=*`, rangeOptions(0, 999999))
      ])
    } else {
      // Para período, derivamos dados a partir de member_activity dentro da janela, de forma parecida com /api/produtividade
      // 1) Buscar atividades do período (ordenadas) e reconstruir métricas necessárias para visão geral
      const filters: string[] = []
      filters.push(`occurred_at=gte.${encodeURIComponent(from)}`)
      filters.push(`occurred_at=lte.${encodeURIComponent(to)}`)
      const queryString = filters.length ? `&${filters.join('&')}` : ''
      const rows: Array<any> = await fetchAll(
        `member_activity?select=occurred_at,card_id,action_type,member_id,member_username,member_fullname,from_list_id,from_list_name,to_list_id,to_list_name,act_type${queryString}&order=occurred_at.asc`
      )

      // 2) Agregar para produzir estruturas equivalentes às views do dashboard, mas limitadas ao período
      // Overall (contagens por tipo de classificação de card usando o que está no evento)
      const overall: any = {
        total_cards: 0,
        cards_with_act_type: 0,
        cards_without_act_type: 0,
        cards_with_clerk: 0,
        cards_with_value: 0,
        total_value: 0,
        cards_needing_reconference: 0,
        opened_cards: 0,
        archived_cards: 0,
      }
      // Para visão do período, interpretamos "total_cards" como quantidade de cards tocados no período
      const touchedCards = new Set<string>()
      for (const r of rows) {
        if (r.card_id) touchedCards.add(r.card_id)
      }
      overall.total_cards = touchedCards.size
      // Para as demais métricas, precisamos consultar estado atual dos cards tocados; como simplificação usamos apenas act_type presente nos eventos
      const actTypeCount = new Map<string, number>()
      for (const r of rows) {
        const act = r.act_type || 'Não definido'
        actTypeCount.set(act, (actTypeCount.get(act) || 0) + 1)
      }
      overall.cards_with_act_type = Array.from(actTypeCount.entries()).filter(([k]) => k !== 'Não definido').reduce((s, [, v]) => s + v, 0)
      overall.cards_without_act_type = actTypeCount.get('Não definido') || 0

      // opened/archived (distintos no período)
      const openedSet = new Set<string>()
      const archivedSet = new Set<string>()
      for (const r of rows) {
        if (!r.card_id) continue
        if (r.action_type === 'create' || r.action_type === 'unarchive') openedSet.add(r.card_id)
        if (r.action_type === 'archive') archivedSet.add(r.card_id)
      }
      overall.opened_cards = openedSet.size
      overall.archived_cards = archivedSet.size

      // lists (quantidade de eventos por lista de destino no período)
      const listAgg = new Map<string, { id: string; name: string; position: number; total_cards: number; cards_with_act_type: number; cards_without_act_type: number }>()
      for (const r of rows) {
        const lid = r.to_list_id || r.from_list_id || 'unknown'
        const lname = r.to_list_name || r.from_list_name || '—'
        if (!listAgg.has(lid)) listAgg.set(lid, { id: lid, name: lname, position: 999999, total_cards: 0, cards_with_act_type: 0, cards_without_act_type: 0 })
        const a = listAgg.get(lid)!
        a.total_cards += 1
        if (r.act_type) a.cards_with_act_type += 1
        else a.cards_without_act_type += 1
      }
      const lists = Array.from(listAgg.values()).sort((a, b) => a.position - b.position)

      // act_types (contagem por tipo no período)
      const actTypes = Array.from(actTypeCount.entries()).map(([name, total_count]) => ({ name, total_count, active_cards: 0, total_value: 0 }))
      actTypes.sort((a, b) => b.total_count - a.total_count)

      // breakdown: por lista e tipo de ato
      const breakdownMap = new Map<string, any>()
      for (const r of rows) {
        const lid = r.to_list_id || r.from_list_id || 'unknown'
        const lname = r.to_list_name || r.from_list_name || '—'
        const act = r.act_type || 'Não definido'
        const key = `${lid}__${act}`
        if (!breakdownMap.has(key)) breakdownMap.set(key, { list_id: lid, list_name: lname, list_position: 999999, total_cards_in_list: 0, unique_act_types: 0, classified_cards: 0, unclassified_cards: 0, completion_percentage: 0, act_type_name: act, cards_count: 0, total_value: 0 })
        const agg = breakdownMap.get(key)
        agg.cards_count += 1
      }
      const breakdown = Array.from(breakdownMap.values()).sort((a, b) => a.list_position - b.list_position || b.cards_count - a.cards_count)

      // pivot: linha por lista com colunas para tipos (período)
      const pivotMap = new Map<string, any>()
      for (const r of rows) {
        const lname = r.to_list_name || r.from_list_name || '—'
        if (!pivotMap.has(lname)) pivotMap.set(lname, { list_name: lname, list_position: 999999, total_cards: 0 })
        const row = pivotMap.get(lname)
        row.total_cards += 1
        const act = r.act_type || 'Não definido'
        row[act] = (row[act] || 0) + 1
      }
      const pivot = Array.from(pivotMap.values())

      // summary: resumo executivo por lista (período)
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

      // Como estamos no modo período, pulamos chamadas às views e construímos o payload abaixo diretamente
      return NextResponse.json({
        overall,
        lists,
        act_types: actTypes,
        breakdown,
        pivot,
        summary,
        open_cards: [],
        _debug: { source_url: SUPABASE_URL, key_tail: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(-8) : null, period: { from, to } },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!listsResponse.ok || !actTypesResponse.ok || !breakdownResponse.ok || !pivotResponse.ok || !summaryResponse.ok || !totalCardsResponse.ok || !openCardsResponse.ok) {
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
