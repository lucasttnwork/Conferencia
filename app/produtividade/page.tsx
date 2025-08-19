'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionNav } from '@/components/section-nav'
import DatePicker from '@/components/date-picker'
import PeriodSelect from '@/components/period-select'
import { MemberActTypeKanban } from '@/components/member-acttype-kanban'
import { MemberFlowsKanban } from '@/components/member-flows-kanban'
import { Gauge, Users, GitBranch, Shapes } from 'lucide-react'

type MemberActivityRow = {
  occurred_at: string
  trello_action_id: string
  card_id: string
  action_type: 'create' | 'move' | 'archive' | 'unarchive' | 'delete' | 'update' | 'comment'
  member_id: string | null
  member_username: string | null
  member_fullname: string | null
  from_list_id: string | null
  from_list_name: string | null
  to_list_id: string | null
  to_list_name: string | null
  act_type: string | null
}

type AggregatedByMember = {
  key: string
  member_fullname: string
  member_username: string
  total_actions: number
  created: number
  moved: number
  archived: number
  unarchived: number
  deleted: number
}

export default function ProdutividadePage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '60d' | '90d' | 'custom'>('30d')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MemberActivityRow[]>([])
  const [overview, setOverview] = useState<any[] | null>(null)
  const [byActType, setByActType] = useState<any[] | null>(null)
  const [flows, setFlows] = useState<any[] | null>(null)

  const parseLocalYmd = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }

  // Constrói limites de período como ISO UTC alinhados ao início/fim do dia local
  const startOfLocalDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const endOfLocalDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
  }

  const buildFilter = (): { fromIso: string; toIso: string } | null => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return null
      const fromLocal = startOfLocalDay(parseLocalYmd(customStart))
      const toLocal = endOfLocalDay(parseLocalYmd(customEnd))
      if (isNaN(fromLocal.getTime()) || isNaN(toLocal.getTime())) return null
      return { fromIso: fromLocal.toISOString(), toIso: toLocal.toISOString() }
    }
    const now = new Date()
    const map: Record<'7d' | '30d' | '60d' | '90d', number> = { '7d': 7, '30d': 30, '60d': 60, '90d': 90 }
    const days = map[period as '7d' | '30d' | '60d' | '90d']
    // Para cobrir dias inteiros: de hoje 00:00-(days-1) até hoje 23:59:59
    const toLocal = endOfLocalDay(now)
    const fromAnchor = new Date(startOfLocalDay(now))
    fromAnchor.setDate(fromAnchor.getDate() - (days - 1))
    const fromLocal = startOfLocalDay(fromAnchor)
    return { fromIso: fromLocal.toISOString(), toIso: toLocal.toISOString() }
  }

  const lastRunRef = useRef<symbol | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const range = buildFilter()
      const runToken = Symbol('prod-fetch')
      lastRunRef.current = runToken
      if (!range) {
        // Limpa dados para evitar exibição de resultados antigos quando o intervalo personalizado está incompleto
        setRows([])
        setOverview(null)
        setByActType(null)
        setFlows(null)
        setLoading(false)
        return
      }
      const { fromIso, toIso } = range
      const qs = new URLSearchParams({ from: fromIso, to: toIso })
      const res = await fetch(`/api/produtividade?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Falha ao carregar produtividade')
      const data = await res.json()
      if (lastRunRef.current !== runToken) return
      setRows((data.rows || []) as MemberActivityRow[])
      if (data.overview) setOverview(data.overview)
      if (data.byActType) setByActType(data.byActType)
      if (data.flows) setFlows(data.flows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd])

  const byMember: AggregatedByMember[] = useMemo(() => {
    if (overview && Array.isArray(overview)) {
      return overview.map((o: any) => ({
        key: o.member_id || o.member_username || o.member_fullname || 'desconhecido',
        member_fullname: o.member_fullname,
        member_username: o.member_username,
        total_actions: o.total_actions,
        created: o.created,
        moved: o.moved,
        archived: o.archived,
        unarchived: o.unarchived,
        deleted: o.deleted,
      }))
    }
    const map = new Map<string, AggregatedByMember>()
    for (const r of rows) {
      const key = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      if (!map.has(key)) {
        map.set(key, {
          key,
          member_fullname: r.member_fullname || 'Desconhecido',
          member_username: r.member_username || '-',
          total_actions: 0,
          created: 0,
          moved: 0,
          archived: 0,
          unarchived: 0,
          deleted: 0,
        })
      }
      const agg = map.get(key)!
      agg.total_actions += 1
      if (r.action_type === 'create') agg.created += 1
      else if (r.action_type === 'move') agg.moved += 1
      else if (r.action_type === 'archive') agg.archived += 1
      else if (r.action_type === 'unarchive') agg.unarchived += 1
      else if (r.action_type === 'delete') agg.deleted += 1
    }
    return Array.from(map.values()).sort((a, b) => b.total_actions - a.total_actions)
  }, [rows, overview])

  const movementsByMemberAndActType = useMemo(() => {
    if (byActType && Array.isArray(byActType)) {
      const grouped = new Map<string, Map<string, number>>()
      for (const r of byActType as any[]) {
        const key = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
        const act = r.act_type_name || 'Não definido'
        if (!grouped.has(key)) grouped.set(key, new Map<string, number>())
        const m = grouped.get(key)!
        m.set(act, (m.get(act) || 0) + (r.moved || r.total_actions || 0))
      }
      return grouped
    }
    const grouped = new Map<string, Map<string, number>>()
    for (const r of rows) {
      if (r.action_type !== 'move') continue
      const key = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      const act = r.act_type || 'Não definido'
      if (!grouped.has(key)) grouped.set(key, new Map<string, number>())
      const m = grouped.get(key)!
      m.set(act, (m.get(act) || 0) + 1)
    }
    return grouped
  }, [rows, byActType])

  const flowsByMember = useMemo(() => {
    type FlowKey = string
    type FlowAgg = { from: string; to: string; count: number; byAct: Map<string, number> }
    if (flows && Array.isArray(flows)) {
      const map = new Map<string, Map<FlowKey, FlowAgg>>()
      for (const r of flows as any[]) {
        const memberKey = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
        const from = r.from_list_name
        const to = r.to_list_name
        const act = r.act_type_name || 'Não definido'
        const flowKey = `${from}→${to}`
        if (!map.has(memberKey)) map.set(memberKey, new Map())
        const inner = map.get(memberKey)!
        if (!inner.has(flowKey)) inner.set(flowKey, { from, to, count: 0, byAct: new Map() })
        const agg = inner.get(flowKey)!
        agg.count += r.moved || 0
        agg.byAct.set(act, (agg.byAct.get(act) || 0) + (r.moved || 0))
      }
      const result = Array.from(map.entries()).map(([member, flows]) => {
        const arr = Array.from(flows.values()).sort((a, b) => b.count - a.count)
        return { member, flows: arr }
      })
      return result
    }
    const map = new Map<string, Map<FlowKey, FlowAgg>>()
    for (const r of rows) {
      if (r.action_type !== 'move') continue
      const memberKey = r.member_id || r.member_username || r.member_fullname || 'desconhecido'
      const from = r.from_list_name || r.from_list_id || '—'
      const to = r.to_list_name || r.to_list_id || '—'
      const flowKey = `${from}→${to}`
      if (!map.has(memberKey)) map.set(memberKey, new Map())
      const inner = map.get(memberKey)!
      if (!inner.has(flowKey)) inner.set(flowKey, { from, to, count: 0, byAct: new Map() })
      const agg = inner.get(flowKey)!
      agg.count += 1
      const act = r.act_type || 'Não definido'
      agg.byAct.set(act, (agg.byAct.get(act) || 0) + 1)
    }
    const result = Array.from(map.entries()).map(([member, flows]) => {
      const arr = Array.from(flows.values()).sort((a, b) => b.count - a.count)
      return { member, flows: arr }
    })
    return result
  }, [rows, flows])

  return (
    <div className="min-h-screen p-4 lg:p-6 pt-20 sm:pt-24">
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-effect p-6 rounded-2xl border border-white/15 bg-white/10">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 animate-pulse"></div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-300">Atualizando produtividade...</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Navegação por seções da página */}
      <SectionNav
        pages={[
          { href: '/', label: 'Visão Geral' },
          { href: '/produtividade', label: 'Produtividade' },
        ]}
        items={[
          { href: '#overview', label: 'Resumo por Membro', icon: <Users className="w-4 h-4 text-blue-400" /> },
          { href: '#by-act', label: 'Por Tipo de Ato', icon: <Shapes className="w-4 h-4 text-purple-400" /> },
          { href: '#flows', label: 'Fluxos', icon: <GitBranch className="w-4 h-4 text-emerald-400" /> },
        ]}
      />

      <div className="max-w-7xl mx-auto space-y-8 mt-16 sm:mt-20 lg:mt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">Produtividade por Membro</h1>
            <p className="text-gray-400 text-sm">Criações, movimentações e arquivamentos no período</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PeriodSelect value={period} onChange={setPeriod as any} />
            {period === 'custom' && (
              <>
                <DatePicker value={customStart} onChange={setCustomStart} />
                <DatePicker value={customEnd} onChange={setCustomEnd} />
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Carregando...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <div className="space-y-8">
            <section id="overview" className="scroll-mt-28">
              <div className="card">
              <div className="card-header">
                <h3 className="card-title">Ações por membro</h3>
                <p className="card-description">Total, criações, movimentações e arquivamentos</p>
              </div>
              <div className="card-content overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="py-2 pr-4">Membro</th>
                      <th className="py-2 pr-4">Usuário</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Criações</th>
                      <th className="py-2 pr-4">Movimentações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMember.map(m => (
                      <tr key={m.key} className="border-b border-gray-900 hover:bg-white/5 transition-colors">
                        <td className="py-2 pr-4">{m.member_fullname}</td>
                        <td className="py-2 pr-4 text-gray-400">{m.member_username}</td>
                        <td className="py-2 pr-4">{m.total_actions}</td>
                        <td className="py-2 pr-4">{m.created}</td>
                        <td className="py-2 pr-4">{m.moved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </section>

            <section id="by-act" className="scroll-mt-28">
              {(() => {
                const columns = Array.from(movementsByMemberAndActType.entries()).map(([memberKey, acts]) => {
                  const items = Array.from(acts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => ({ name, count }))
                  const total = items.reduce((sum, it) => sum + it.count, 0)
                  const memberName = byMember.find(m => m.key === memberKey)?.member_fullname || memberKey
                  return { memberKey, memberName, total, items }
                })
                return <MemberActTypeKanban data={columns} />
              })()}
            </section>

            <section id="flows" className="scroll-mt-28">
              {(() => {
                const columns = flowsByMember.map(({ member, flows }) => {
                  const items = flows
                    .map(f => ({ label: `${f.from} → ${f.to}` , count: f.count }))
                    .sort((a, b) => b.count - a.count)
                  const total = items.reduce((sum, it) => sum + it.count, 0)
                  const memberName = byMember.find(m => m.key === member)?.member_fullname || member
                  return { memberKey: member, memberName, total, flows: items }
                })
                return <MemberFlowsKanban data={columns} />
              })()}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}


