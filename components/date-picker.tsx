'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
}

function formatDisplay(value?: string) {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const initialDate = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      if (y && m && d) return new Date(y, m - 1, d)
    }
    return new Date()
  }, [value])
  const [visibleYear, setVisibleYear] = useState<number>(initialDate.getFullYear())
  const [visibleMonth, setVisibleMonth] = useState<number>(initialDate.getMonth()) // 0-11

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (anchorRef.current && !anchorRef.current.contains(t)) {
        const pop = document.getElementById('date-popover')
        if (pop && !pop.contains(t)) setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const weeks = useMemo(() => {
    const first = new Date(visibleYear, visibleMonth, 1)
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate()
    const startIdx = (first.getDay() + 6) % 7 // monday=0
    const cells: Array<{ day: number | null; inMonth: boolean; date?: Date }> = []
    for (let i = 0; i < startIdx; i++) cells.push({ day: null, inMonth: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(visibleYear, visibleMonth, d)
      cells.push({ day: d, inMonth: true, date })
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, inMonth: false })
    const rows: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [visibleYear, visibleMonth])

  const display = formatDisplay(value)

  const goPrev = () => {
    const d = new Date(visibleYear, visibleMonth, 1)
    d.setMonth(d.getMonth() - 1)
    setVisibleYear(d.getFullYear())
    setVisibleMonth(d.getMonth())
  }
  const goNext = () => {
    const d = new Date(visibleYear, visibleMonth, 1)
    d.setMonth(d.getMonth() + 1)
    setVisibleYear(d.getFullYear())
    setVisibleMonth(d.getMonth())
  }

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        className="inline-flex items-center gap-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 px-4 py-2 transition-all"
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays className="w-4 h-4 text-white/80" />
        <span className="text-sm min-w-[6.5rem] text-left">{display || placeholder}</span>
      </button>
      {open && (
        <div id="date-popover" className="absolute z-50 mt-2 right-0">
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] w-72">
            <div className="flex items-center justify-between px-1 pb-2">
              <button aria-label="Mês anterior" onClick={goPrev} className="p-2 rounded-full hover:bg-white/10 border border-white/10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-white/90 text-sm">
                {new Date(visibleYear, visibleMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
              <button aria-label="Próximo mês" onClick={goNext} className="p-2 rounded-full hover:bg-white/10 border border-white/10">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-white/70 pb-1">
              {['seg','ter','qua','qui','sex','sáb','dom'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map((row, i) => (
                <div key={i} className="contents">
                  {row.map((cell, j) => {
                    const isSelected = cell.inMonth && value && cell.date && toYmd(cell.date) === value
                    return (
                      <button
                        key={j}
                        disabled={!cell.inMonth || !cell.day}
                        onClick={() => {
                          if (!cell.date) return
                          onChange(toYmd(cell.date))
                          setOpen(false)
                        }}
                        className={`h-9 rounded-xl text-sm border transition-colors ${
                          isSelected
                            ? 'bg-white/20 border-white/20 text-white'
                            : cell.inMonth
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                              : 'bg-transparent border-transparent text-white/40'
                        }`}
                      >
                        {cell.day || ''}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker


