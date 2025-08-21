'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

type SeriesDaily = {
  days: string[]
  labels: string[]
  rows: Array<{ day: string; total: number; [label: string]: number | string }>
}

interface LineDailyProps {
  series: SeriesDaily
  topK?: number
}

function buildColorPalette(n: number): string[] {
  const base = [
    '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#c084fc', '#fb7185', '#93c5fd'
  ]
  const colors: string[] = []
  for (let i = 0; i < n; i++) colors.push(base[i % base.length])
  return colors
}

export function LineDaily({ series, topK = 6 }: LineDailyProps) {
  const { data, keys, colors } = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of series.rows) {
      for (const lb of series.labels) {
        const v = Number((r as any)[lb] || 0)
        totals.set(lb, (totals.get(lb) || 0) + v)
      }
    }
    const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
    const top = ranked.slice(0, topK).map((x) => x[0])
    const data = series.days.map((d) => {
      const src = series.rows.find((x) => x.day === d) || { day: d, total: 0 }
      const obj: any = { day: d }
      for (const lb of top) obj[lb] = Number((src as any)[lb] || 0)
      obj['Total'] = Number((src as any).total || 0)
      return obj
    })
    const keys = [...top, 'Total']
    const colors = buildColorPalette(keys.length)
    return { data, keys, colors }
  }, [series, topK])

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="day" tick={{ fill: '#9ca3af' }} />
          <YAxis tick={{ fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


