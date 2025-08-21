'use client'

type SeriesDaily = {
  days: string[]
  labels: string[]
  rows: Array<{ day: string; total: number; [label: string]: number | string }>
}

interface KpiCardsProps {
  title: string
  daily?: SeriesDaily
}

export function KpiCards({ title, daily }: KpiCardsProps) {
  let total = 0
  let peak = 0
  let peakDay = ''
  let avg = 0
  let topLabel = '-'
  let topLabelCount = 0

  if (daily && daily.rows.length) {
    const labelTotals = new Map<string, number>()
    for (const r of daily.rows) {
      total += Number(r.total || 0)
      if (Number(r.total || 0) > peak) {
        peak = Number(r.total || 0)
        peakDay = r.day
      }
      for (const lb of daily.labels) labelTotals.set(lb, (labelTotals.get(lb) || 0) + Number((r as any)[lb] || 0))
    }
    avg = Math.round(total / Math.max(1, daily.rows.length))
    const best = Array.from(labelTotals.entries()).sort((a, b) => b[1] - a[1])[0]
    if (best) {
      topLabel = best[0]
      topLabelCount = best[1]
    }
  }

  const Card = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-white mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="text-white/90 font-semibold">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total no período" value={total} />
        <Card label="Média por dia" value={avg} />
        <Card label="Pico por dia" value={peak} hint={peakDay} />
        <Card label="Top etiqueta" value={topLabel} hint={`${topLabelCount} atos`} />
      </div>
    </div>
  )
}


