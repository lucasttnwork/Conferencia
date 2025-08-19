import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Buscar dados das views do dashboard (sem cache e com paginação ampla quando necessário)
    const commonOptions: RequestInit = {
      // Evita qualquer cache do Next.js ou do fetch
      cache: 'no-store' as RequestCache,
      // @ts-ignore - dica para o Next.js
      next: { revalidate: 0 },
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

    const [listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse, openCardsResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_lists?select=*`, commonOptions),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_act_types?select=*`, commonOptions),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_breakdown?select=*`, commonOptions),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_pivot?select=*`, commonOptions),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_summary?select=*`, commonOptions),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_total_cards?select=*`, commonOptions),
      // Pode ter muitos registros; solicitar faixa ampla
      fetch(`${SUPABASE_URL}/rest/v1/open_cards?select=*`, rangeOptions(0, 999999))
    ])

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
