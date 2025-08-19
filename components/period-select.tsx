'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type PeriodValue = '7d' | '30d' | '60d' | '90d' | 'custom'

interface PeriodSelectProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
}

const options: Array<{ value: PeriodValue; label: string }> = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '60d', label: 'Últimos 60 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
]

export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      const pop = document.getElementById('period-menu')
      if (btnRef.current && !btnRef.current.contains(t) && pop && !pop.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const current = options.find((o) => o.value === value)?.label || 'Selecionar período'

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className="inline-flex items-center gap-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 px-4 py-2 text-sm transition-all"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{current}</span>
        <ChevronDown className="w-4 h-4 text-white/80" />
      </button>
      {open && (
        <div id="period-menu" className="absolute z-50 mt-2 min-w-[14rem] rounded-2xl border border-white/15 bg-white/10 backdrop-blur-2xl p-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          {options.map((o) => (
            <button
              key={o.value}
              className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                o.value === value
                  ? 'bg-white/20 border-white/20 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
              }`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              role="menuitemradio"
              aria-checked={o.value === value}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PeriodSelect


