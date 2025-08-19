'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Users } from 'lucide-react'

interface MemberActTypeColumn {
  memberKey: string
  memberName: string
  total: number
  items: Array<{ name: string; count: number }>
}

interface MemberActTypeKanbanProps {
  data: MemberActTypeColumn[]
}

export function MemberActTypeKanban({ data }: MemberActTypeKanbanProps) {
  const [showAllPerMember, setShowAllPerMember] = useState<Record<string, boolean>>({})

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.total - a.total)
  }, [data])

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="card-title">Movimentações por Tipo de Ato (por membro) - Kanban</h3>
              <p className="card-description">Cada coluna é um membro; abaixo, os tipos de ato mais movimentados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-content">
        {sorted.length > 0 ? (
          <div className="overflow-x-auto scroll-smooth">
            <div className="flex gap-4 pb-4 min-w-max">
              {sorted.map((col) => {
                const showAll = !!showAllPerMember[col.memberKey]
                const visible = showAll ? col.items : col.items.slice(0, 12)
                return (
                  <div key={col.memberKey} className="min-w-[20rem] w-[20rem] flex-shrink-0">
                    <div className="h-full flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/30">
                      <div className="px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-700/50 rounded-t-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                            <Users className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate" title={col.memberName}>{col.memberName}</h4>
                            <div className="text-xs text-gray-300">
                              {col.total} movimentações
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {visible.map((t) => (
                          <div key={`${col.memberKey}-${t.name}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700/50 hover:bg-gray-900/60 transition-colors">
                            <span className="text-sm text-gray-200 truncate pr-3" title={t.name}>{t.name}</span>
                            <span className="text-sm font-semibold text-blue-400">{t.count}</span>
                          </div>
                        ))}
                        {col.items.length > 12 && (
                          <button
                            className="w-full mt-1 text-xs text-white/90 hover:text-white py-1 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                            onClick={() => setShowAllPerMember((prev) => ({ ...prev, [col.memberKey]: !prev[col.memberKey] }))}
                          >
                            {showAll ? 'Ver menos' : `Ver todos (${col.items.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Sem dados de movimentações</div>
        )}
      </div>
    </div>
  )
}


