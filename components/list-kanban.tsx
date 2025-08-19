'use client'

import { useMemo, useState } from 'react'
import { BarChart3, FileText } from 'lucide-react'

type ListKanbanRow = {
  list_name: string
  list_position: number
  total_cards: number
  'Total Classificados': number
  'Percentual Classificados': number
} & Record<string, number | string>

interface ListKanbanProps {
  data: ListKanbanRow[]
}

export function ListKanban({ data }: ListKanbanProps) {
  const [showAllPerColumn, setShowAllPerColumn] = useState<Record<string, boolean>>({})

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.list_position - b.list_position)
  }, [data])

  const excludedKeys: Set<string> = useMemo(
    () => new Set([
      'list_name',
      'list_position',
      'total_cards',
      'Total Classificados',
      'Percentual Classificados',
      'Não definido'
    ]),
    []
  )

  const getActTypeEntries = (row: ListKanbanRow) => {
    return Object.entries(row)
      .filter(([key, value]) => !excludedKeys.has(key) && typeof value === 'number' && (value as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, count]) => ({ name, count: count as number }))
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="card-title">Distribuição por Lista - Kanban</h3>
              <p className="card-description">Cada coluna é uma lista; abaixo do título, os tipos de ato com suas quantidades</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-content">
        {sortedData.length > 0 ? (
          <div className="relative">
            <div className="overflow-x-auto scroll-smooth">
              <div className="flex gap-4 pb-4 min-w-max snap-x snap-mandatory">
                {sortedData.map((row) => {
                  const actTypes = getActTypeEntries(row)
                  const showAll = !!showAllPerColumn[row.list_name]
                  const visibleActTypes = showAll ? actTypes : actTypes.slice(0, 12)

                  return (
                    <div key={row.list_name} className="snap-start min-w-[18rem] w-[18rem] flex-shrink-0">
                      <div className="h-full flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/30">
                        {/* Header da coluna */}
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-700/50 rounded-t-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                              <FileText className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white truncate" title={row.list_name}>{row.list_name}</h4>
                              <div className="text-xs text-gray-300 flex items-center gap-2">
                                <span>{row.total_cards} cards</span>
                                <span>•</span>
                                <span>{row['Total Classificados']} classif.</span>
                                <span>•</span>
                                <span>{row['Percentual Classificados']}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo: tipos de ato como "cards" curtos */}
                        <div className="p-3 space-y-2">
                          {visibleActTypes.map((t) => (
                            <div key={`${row.list_name}-${t.name}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700/50 hover:bg-gray-900/60 transition-colors">
                              <span className="text-sm text-gray-200 truncate pr-3" title={t.name}>{t.name}</span>
                              <span className="text-sm font-semibold text-blue-400">{t.count}</span>
                            </div>
                          ))}

                          {actTypes.length > 12 && (
                            <button
                              className="w-full mt-1 text-xs text-white/90 hover:text-white py-1 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                              onClick={() =>
                                setShowAllPerColumn((prev) => ({
                                  ...prev,
                                  [row.list_name]: !prev[row.list_name]
                                }))
                              }
                            >
                              {showAll ? 'Ver menos' : `Ver todos (${actTypes.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhum dado encontrado</p>
            <p className="text-sm text-gray-500">Execute as views SQL para ver os dados</p>
          </div>
        )}
      </div>
    </div>
  )
}


