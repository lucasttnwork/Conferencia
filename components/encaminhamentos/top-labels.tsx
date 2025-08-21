'use client'

import { useMemo } from 'react'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface TopLabelsProps {
  series: Series
  limit?: number
}

export function TopLabels({ series, limit = 10 }: TopLabelsProps) {
  const items = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of series.rows) {
      for (const lb of series.labels) {
        const v = Number((r as any)[lb] || 0)
        totals.set(lb, (totals.get(lb) || 0) + v)
      }
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  }, [series, limit])

  const totalAll = items.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(([name, count]) => {
        const pct = totalAll ? Math.round((count / totalAll) * 100) : 0
        return (
          <div key={name} className="p-3 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{name}</span>
              <span className="text-sm text-gray-400">{count}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}


