'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface StackedAreaProps {
  series: Series
  normalized?: boolean
  topK?: number
}

function buildColorPalette(n: number): string[] {
  const base = [
    '#60a5fa',
    '#34d399',
    '#f59e0b',
    '#f472b6',
    '#a78bfa',
    '#f87171',
    '#22d3ee',
    '#c084fc',
    '#fb7185',
    '#93c5fd',
  ]
  const colors: string[] = []
  for (let i = 0; i < n; i++) colors.push(base[i % base.length])
  return colors
}

export function StackedArea({ series, normalized = false, topK = 6 }: StackedAreaProps) {
  const { data, keys, colors } = useMemo(() => {
    const totalsByLabel = new Map<string, number>()
    for (const r of series.rows) {
      for (const lb of series.labels) {
        const v = Number((r as any)[lb] || 0)
        totalsByLabel.set(lb, (totalsByLabel.get(lb) || 0) + v)
      }
    }
    const ranked = Array.from(totalsByLabel.entries()).sort((a, b) => b[1] - a[1])
    const top = ranked.slice(0, topK).map((x) => x[0])
    const data = series.months.map((m) => {
      const src = series.rows.find((x) => x.month === m) || { month: m, total: 0 }
      const obj: any = { month: m }
      let others = Number((src as any).total || 0)
      for (const lb of top) {
        const v = Number((src as any)[lb] || 0)
        obj[lb] = v
        others -= v
      }
      obj['Outras'] = Math.max(0, others)
      if (normalized) {
        const sum = Math.max(1, Number((src as any).total || 0))
        for (const k of [...top, 'Outras']) obj[k] = Number(obj[k] || 0) / sum
      }
      return obj
    })
    const keys = [...top, 'Outras']
    const colors = buildColorPalette(keys.length)
    return { data, keys, colors }
  }, [series, normalized, topK])

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="month" tick={{ fill: '#9ca3af' }} />
          <YAxis tick={{ fill: '#9ca3af' }} domain={normalized ? [0, 1] : ['auto', 'auto']} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[i]} fill={colors[i]} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


