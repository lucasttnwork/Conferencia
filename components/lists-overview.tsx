'use client'

import { List, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'

interface ListsOverviewProps {
  lists: Array<{
    id: string
    name: string
    position: number
    total_cards: number
    cards_with_act_type: number
    cards_without_act_type: number
  }>
}

export function ListsOverview({ lists }: ListsOverviewProps) {
  const sortedLists = [...lists].sort((a, b) => a.position - b.position)

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <List className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="card-title">Visão Geral das Listas</h3>
            <p className="card-description">
              Distribuição de cards por lista e status de classificação
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        <div className="space-y-4">
          {sortedLists.map((list) => {
            const completionRate = list.total_cards > 0 
              ? Math.round((list.cards_with_act_type / list.total_cards) * 100)
              : 0
            
            const getStatusColor = (rate: number) => {
              if (rate >= 80) return 'text-green-600 bg-green-100'
              if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
              return 'text-red-600 bg-red-100'
            }

            const getStatusIcon = (rate: number) => {
              if (rate >= 80) return <CheckCircle className="w-4 h-4" />
              if (rate >= 60) return <AlertCircle className="w-4 h-4" />
              return <AlertCircle className="w-4 h-4" />
            }

            return (
              <div
                key={list.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{list.name}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(completionRate)}`}>
                    {completionRate}% completo
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BarChart3 className="w-4 h-4" />
                    <span>{list.total_cards} cards</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{list.cards_with_act_type} classificados</span>
                  </div>
                  
                  {list.cards_without_act_type > 0 && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>{list.cards_without_act_type} pendentes</span>
                    </div>
                  )}
                </div>
                
                {/* Barra de progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                
                {/* Status detalhado */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  {getStatusIcon(completionRate)}
                  <span>
                    {completionRate >= 80 
                      ? 'Lista bem organizada' 
                      : completionRate >= 60 
                      ? 'Necessita atenção' 
                      : 'Requer ação imediata'
                    }
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Resumo */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Total de Listas: {lists.length}
              </p>
              <p className="text-xs text-gray-500">
                {lists.filter(l => l.total_cards > 0).length} com cards ativos
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                Cards Totais: {lists.reduce((sum, l) => sum + l.total_cards, 0)}
              </p>
              <p className="text-xs text-gray-500">
                Média: {Math.round(lists.reduce((sum, l) => sum + l.total_cards, 0) / Math.max(lists.length, 1))} por lista
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
