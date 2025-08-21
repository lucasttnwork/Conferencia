'use client'

import { useMemo } from 'react'

type Series = {
  months: string[]
  labels: string[]
  rows: Array<{ month: string; total: number; [label: string]: number | string }>
}

interface HeatmapProps {
  series: Series
}

export function LabelsHeatmap({ series }: HeatmapProps) {
  const { months, labels, values, max } = useMemo(() => {
    const months = series.months
    const labels = series.labels
    const values: number[][] = months.map(() => labels.map(() => 0))
    let max = 0
    months.forEach((m, mi) => {
      const row = series.rows.find((r) => r.month === m) || { month: m, total: 0 }
      labels.forEach((lb, li) => {
        const v = Number((row as any)[lb] || 0)
        values[mi][li] = v
        if (v > max) max = v
      })
    })
    return { months, labels, values, max }
  }, [series])

  const color = (v: number) => {
    if (max <= 0) return 'rgba(59,130,246,0.05)'
    const t = Math.min(1, v / max)
    const alpha = 0.1 + 0.6 * t
    return `rgba(59,130,246,${alpha})`
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left pr-4 py-2">Etiqueta</th>
            {months.map((m) => (
              <th key={m} className="px-2 py-2 text-center">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((lb, li) => (
            <tr key={lb} className="border-t border-gray-800">
              <td className="pr-4 py-2 whitespace-nowrap text-gray-300">{lb}</td>
              {months.map((m, mi) => (
                <td key={`${lb}-${m}`} className="px-2 py-1">
                  <div
                    className="rounded-md text-center px-2 py-1"
                    style={{ backgroundColor: color(values[mi][li]) }}
                  >
                    {values[mi][li]}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


