'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface DonutLatestProps {
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

export function DonutLatest({ series, topK = 7 }: DonutLatestProps) {
  const { data, colors } = useMemo(() => {
    const lastMonth = series.months[series.months.length - 1]
    const row = series.rows.find((r) => r.month === lastMonth) || { month: lastMonth, total: 0 }
    const items = series.labels.map((lb) => ({ name: lb, value: Number((row as any)[lb] || 0) }))
    items.sort((a, b) => b.value - a.value)
    const top = items.slice(0, topK)
    const restValue = items.slice(topK).reduce((s, it) => s + it.value, 0)
    const data = [...top, { name: 'Outras', value: restValue }]
    const colors = buildColorPalette(data.length)
    return { data, colors }
  }, [series, topK])

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie dataKey="value" data={data} innerRadius={60} outerRadius={100} stroke="#111827">
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}


