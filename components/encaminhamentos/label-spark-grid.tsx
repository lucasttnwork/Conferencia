'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface LabelSparkGridProps {
  series: Series
  limit?: number
}

export function LabelSparkGrid({ series, limit = 12 }: LabelSparkGridProps) {
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
      .map(([name]) => ({
        name,
        data: series.months.map((m) => {
          const r = series.rows.find((x) => x.month === m) || { month: m }
          return { month: m, value: Number((r as any)[name] || 0) }
        }),
      }))
  }, [series, limit])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.name} className="p-3 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">{it.name}</span>
            <span className="text-sm text-gray-400">{it.data.reduce((s, d) => s + d.value, 0)}</span>
          </div>
          <div className="w-full h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={it.data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <XAxis dataKey="month" hide />
                <YAxis hide />
                <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="#60a5fa33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  )
}


