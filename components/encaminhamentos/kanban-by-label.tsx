'use client'

import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface KanbanByLabelProps {
  series: Series
  limitColumns?: number
}

export function KanbanByLabel({ series, limitColumns = 18 }: KanbanByLabelProps) {
  const [expanded, setExpanded] = useState(false)

  const columns = useMemo(() => {
    // Soma total por etiqueta, ordena desc
    const totals = new Map<string, number>()
    for (const r of series.rows) for (const lb of series.labels) totals.set(lb, (totals.get(lb) || 0) + Number((r as any)[lb] || 0))
    const ordered = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
    const top = expanded ? ordered : ordered.slice(0, limitColumns)
    return top.map(([name, count]) => ({ name, total: count }))
  }, [series, expanded, limitColumns])

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">Kanban por Etiqueta</h4>
        <p className="card-description">Colunas por etiqueta; cards por mês com contagem</p>
      </div>
      <div className="card-content">
        {columns.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Sem dados para exibir</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2 min-w-max">
              {columns.map((col) => (
                <div key={col.name} className="min-w-[16rem] w-[16rem]">
                  <div className="rounded-xl border border-white/10 bg-white/5">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white/90 truncate" title={col.name}>{col.name}</span>
                        <span className="text-sm text-blue-400">{col.total}</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {series.months.map((m) => {
                        const r = series.rows.find((x) => x.month === m) || { month: m }
                        const v = Number((r as any)[col.name] || 0)
                        if (!v) return null
                        return (
                          <div key={`${col.name}-${m}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700/50">
                            <span className="text-xs text-gray-300">{m}</span>
                            <span className="text-sm font-semibold text-blue-400">{v}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3">
          <button
            className="px-3 py-1.5 text-sm rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white/90"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Mostrar menos' : 'Mostrar todas as etiquetas'}
          </button>
        </div>
      </div>
    </div>
  )
}


