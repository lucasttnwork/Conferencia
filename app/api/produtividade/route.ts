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

    const filters: string[] = []
    if (from) filters.push(`occurred_at=gte.${encodeURIComponent(from)}`)
    if (to) filters.push(`occurred_at=lte.${encodeURIComponent(to)}`)
    const queryString = filters.length ? `&${filters.join('&')}` : ''

    const url = `${SUPABASE_URL}/rest/v1/member_activity?select=*${queryString}`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    if (!res.ok) throw new Error('Falha ao consultar member_activity')
    const rows = await res.json()

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
      else if (r.action_type === 'archive') agg.archived += 1
      else if (r.action_type === 'unarchive') agg.unarchived += 1
      else if (r.action_type === 'delete') agg.deleted += 1
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
      const memberKey = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      const fromName = r.from_list_name || r.from_list_id || '—'
      const toName = r.to_list_name || r.to_list_id || '—'
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


