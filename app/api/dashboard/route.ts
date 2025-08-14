import { NextResponse } from 'next/server'

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

    // Buscar dados das views do dashboard
    const [listsResponse, actTypesResponse, breakdownResponse, pivotResponse, summaryResponse, totalCardsResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_lists?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_act_types?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_breakdown?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_pivot?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_list_summary?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_total_cards?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })
    ])

    if (!listsResponse.ok || !actTypesResponse.ok || !breakdownResponse.ok || !pivotResponse.ok || !summaryResponse.ok || !totalCardsResponse.ok) {
      throw new Error('Erro ao buscar dados do Supabase')
    }

    const [lists, actTypes, breakdown, pivot, summary, totalCards] = await Promise.all([
      listsResponse.json(),
      actTypesResponse.json(),
      breakdownResponse.json(),
      pivotResponse.json(),
      summaryResponse.json(),
      totalCardsResponse.json()
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
      summary
    })

  } catch (error) {
    console.error('Erro na API do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
