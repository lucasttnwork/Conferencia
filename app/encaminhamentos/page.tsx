'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionNav } from '@/components/section-nav'
import DatePicker from '@/components/date-picker'
import PeriodSelect from '@/components/period-select'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StackedBar } from '@/components/encaminhamentos/stacked-bar'
import { StackedArea } from '@/components/encaminhamentos/stacked-area'
import { DonutLatest } from '@/components/encaminhamentos/donut-latest'
import { LabelSparkGrid } from '@/components/encaminhamentos/label-spark-grid'
import { LabelsHeatmap } from '@/components/encaminhamentos/labels-heatmap'
import { KanbanByLabel } from '@/components/encaminhamentos/kanban-by-label'
import { KpiCards } from '@/components/encaminhamentos/kpi-cards'
import { LineDaily } from '@/components/encaminhamentos/line-daily'
import { TopLabels } from '@/components/encaminhamentos/top-labels'

type Dataset = {
  key: string
  title: string
  series: {
    months: string[]
    labels: string[]
    rows: Array<{ month: string; total: number; [label: string]: number | string }>
  }
  seriesDaily?: {
    days: string[]
    labels: string[]
    rows: Array<{ day: string; total: number; [label: string]: number | string }>
  }
}

export default function EncaminhamentosPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '60d' | '90d' | 'custom'>('90d')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [viewByKey, setViewByKey] = useState<Record<string, 'daily' | 'monthly' | 'kanban' | 'table'>>({})
  const [selectedByKey, setSelectedByKey] = useState<Record<string, Set<string>>>({})
  const [topByKey, setTopByKey] = useState<Record<string, number>>({})

  const parseLocalYmd = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }

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
      const runToken = Symbol('enc-fetch')
      lastRunRef.current = runToken
      if (!range) {
        setDatasets([])
        setLoading(false)
        return
      }
      const { fromIso, toIso } = range
      const qs = new URLSearchParams({ from: fromIso, to: toIso })
      const res = await fetch(`/api/encaminhamentos?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Falha ao carregar encaminhamentos')
      const data = await res.json()
      if (lastRunRef.current !== runToken) return
      setDatasets(Array.isArray(data.datasets) ? data.datasets : [])
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

  const renderTable = (ds: Dataset) => {
    const months = ds.series.months
    const labels = ds.series.labels
    const rows = ds.series.rows
    const view = viewByKey[ds.key] || 'daily'
    const selected = selectedByKey[ds.key] || new Set<string>()
    const topN = topByKey[ds.key] ?? 8

    // Define etiquetas exibidas: selecionadas têm prioridade; senão, topN por volume
    const pickLabels = (() => {
      if (selected.size > 0) return Array.from(selected)
      const totals = new Map<string, number>()
      for (const r of ds.series.rows) for (const lb of ds.series.labels) totals.set(lb, (totals.get(lb) || 0) + Number((r as any)[lb] || 0))
      return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, Math.max(1, topN)).map(([n]) => n)
    })()

    const filterSeries = (series: { months: string[]; labels: string[]; rows: any[] }) => {
      const useLabels = series.labels.filter((lb) => pickLabels.includes(lb))
      const rows = series.months.map((m) => {
        const src = series.rows.find((x: any) => x.month === m) || { month: m, total: 0 }
        const obj: any = { month: m, total: 0 }
        for (const lb of useLabels) {
          const v = Number((src as any)[lb] || 0)
          obj[lb] = v
          obj.total += v
        }
        return obj
      })
      return { months: series.months, labels: useLabels, rows }
    }

    const filterSeriesDaily = (series: { days: string[]; labels: string[]; rows: any[] } | undefined) => {
      if (!series) return undefined
      const useLabels = series.labels.filter((lb) => pickLabels.includes(lb))
      const rows = series.days.map((d) => {
        const src = series.rows.find((x: any) => x.day === d) || { day: d, total: 0 }
        const obj: any = { day: d, total: 0 }
        for (const lb of useLabels) {
          const v = Number((src as any)[lb] || 0)
          obj[lb] = v
          obj.total += v
        }
        return obj
      })
      return { days: series.days, labels: useLabels, rows }
    }

    const filteredMonthly = filterSeries(ds.series)
    const filteredDaily = filterSeriesDaily(ds.seriesDaily)
    const allLabels = ds.series.labels

    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{ds.title}</h3>
          <p className="card-description">Séries diárias e mensais, com detalhamento por etiquetas</p>
        </div>
        <div className="card-content">
          {/* Controles: abas e filtros */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 overflow-hidden w-fit">
              {(['daily','monthly','kanban','table'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewByKey((prev) => ({ ...prev, [ds.key]: v }))}
                  className={`px-3 py-1.5 text-sm ${view===v? 'bg-white/20 text-white border-r border-white/10' : 'text-white/85 hover:bg-white/10 border-r border-transparent'}`}
                >
                  {v === 'daily' ? 'Diário' : v === 'monthly' ? 'Mensal' : v === 'kanban' ? 'Kanban' : 'Tabela'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 mr-1">Filtrar etiquetas:</span>
              {allLabels.slice(0, 20).map((lb) => {
                const sel = (selectedByKey[ds.key] || new Set()).has(lb)
                return (
                  <button
                    key={lb}
                    onClick={() => {
                      setSelectedByKey((prev) => {
                        const next = new Set(prev[ds.key] || []) as Set<string>
                        if (sel) next.delete(lb); else next.add(lb)
                        return { ...prev, [ds.key]: next }
                      })
                    }}
                    className={`px-2 py-1 rounded-full text-xs border ${sel ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/85 hover:bg-white/10'}`}
                    title={lb}
                  >
                    {lb}
                  </button>
                )
              })}
              <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-gray-400">Top N</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={topN}
                  onChange={(e) => setTopByKey((prev) => ({ ...prev, [ds.key]: Math.max(1, Math.min(20, Number(e.target.value||8))) }))}
                  className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                />
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/15 border border-white/15"
                  onClick={() => { setSelectedByKey((p) => ({ ...p, [ds.key]: new Set() })); }}
                >Limpar</button>
              </div>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="mb-6">
            <KpiCards title="Resumo do período" daily={filteredDaily as any} />
          </div>

          {/* Visual por aba */}
          {view === 'daily' && filteredDaily && (
            <div className="mb-6">
              <LineDaily series={filteredDaily} />
            </div>
          )}

          {view === 'monthly' && (
            <>
              <StackedArea series={filteredMonthly} normalized />
              <div className="mt-6">
                <DonutLatest series={filteredMonthly} />
              </div>
              <div className="mt-6">
                <StackedBar series={filteredMonthly} />
              </div>
              <div className="mt-6">
                <TopLabels series={filteredMonthly} />
              </div>
              <div className="mt-6">
                <LabelSparkGrid series={filteredMonthly} />
              </div>
              <div className="mt-6">
                <LabelsHeatmap series={filteredMonthly} />
              </div>
            </>
          )}

          {view === 'kanban' && (
            <div className="mt-6">
              <KanbanByLabel series={filteredMonthly} />
            </div>
          )}

          {view === 'table' && (
            <div className="w-full overflow-x-auto mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Total</TableHead>
                    {filteredMonthly.labels.map((lb) => (
                      <TableHead key={lb}>{lb}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMonthly.months.map((m) => {
                    const r = filteredMonthly.rows.find((x) => x.month === m) || { month: m, total: 0 }
                    return (
                      <TableRow key={m}>
                        <TableCell>{m}</TableCell>
                        <TableCell>{Number((r as any).total || 0)}</TableCell>
                        {filteredMonthly.labels.map((lb) => (
                          <TableCell key={lb}>{Number((r as any)[lb] || 0)}</TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableCaption>Contagens agregadas por mês e etiqueta</TableCaption>
              </Table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 pt-20 sm:pt-24">
      {/* Navegação */}
      <SectionNav
        pages={[
          { href: '/', label: 'Visão Geral' },
          { href: '/produtividade', label: 'Produtividade' },
          { href: '/encaminhamentos', label: 'Encaminhamentos' },
        ]}
        items={[]}
      />

      <div className="max-w-7xl mx-auto space-y-8 mt-16 sm:mt-20 lg:mt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">Encaminhamentos</h1>
            <p className="text-gray-400 text-sm">Movimentos mensais entre listas com detalhamento por etiquetas</p>
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
            {datasets.map((ds) => (
              <section key={ds.key} id={ds.key} className="scroll-mt-28">
                {renderTable(ds)}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


