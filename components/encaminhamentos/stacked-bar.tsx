'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

interface StackedBarProps {
  title?: string
  series: Series
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

export function StackedBar({ series, topK = 6 }: StackedBarProps) {
  const { data, keys, colors } = useMemo(() => {
    // Descobre topK etiquetas por soma total
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
      return obj
    })
    const keys = [...top, 'Outras']
    const colors = buildColorPalette(keys.length)
    return { data, keys, colors }
  }, [series, topK])

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="month" tick={{ fill: '#9ca3af' }} />
          <YAxis tick={{ fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={colors[i]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}


