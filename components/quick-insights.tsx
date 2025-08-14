'use client'

import { TrendingUp, AlertTriangle, CheckCircle, Clock, Lightbulb } from 'lucide-react'

interface QuickInsightsProps {
  breakdown: Array<{
    list_id: string
    list_name: string
    list_position: number
    act_type_name: string
    cards_count: number
    total_value: number
  }>
  actTypes: Array<{
    name: string
    total_count: number
    active_cards: number
    total_value: number
  }>
}

export function QuickInsights({ breakdown, actTypes }: QuickInsightsProps) {
  // Calcular insights rápidos
  const totalActTypes = actTypes.filter(act => act.name !== 'Não definido').length
  const topActType = actTypes
    .filter(act => act.name !== 'Não definido')
    .reduce((max, act) => act.total_count > max.total_count ? act : max, 
      { name: '', total_count: 0, active_cards: 0, total_value: 0 }
    )
  
  const listsWithCards = breakdown
    .reduce((acc, item) => {
      if (!acc[item.list_name]) {
        acc[item.list_name] = { total: 0, classified: 0 }
      }
      acc[item.list_name].total += item.cards_count
      if (item.act_type_name !== 'Não definido') {
        acc[item.list_name].classified += item.cards_count
      }
      return acc
    }, {} as Record<string, { total: number, classified: number }>)

  const listsNeedingAttention = Object.entries(listsWithCards)
    .filter(([, data]) => data.total > 0 && data.classified === 0)
    .length

  const listsWellOrganized = Object.entries(listsWithCards)
    .filter(([, data]) => data.total > 0 && data.classified > 0)
    .length

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl border border-purple-500/30">
            <Lightbulb className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="card-title">Insights Rápidos</h3>
            <p className="card-description">
              Resumo executivo e alertas importantes
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tipos de Ato Identificados */}
          <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-2">{totalActTypes}</p>
            <p className="text-sm text-blue-300 font-medium mb-1">Tipos de Ato</p>
            <p className="text-xs text-blue-400/70">Identificados no sistema</p>
          </div>

          {/* Tipo Mais Comum */}
          <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-lg font-bold text-green-400 truncate mb-2" title={topActType.name || 'N/A'}>
              {topActType.name || 'N/A'}
            </p>
            <p className="text-sm text-green-300 font-medium mb-1">
              {topActType.total_count} cards
            </p>
            <p className="text-xs text-green-400/70">Tipo mais comum</p>
          </div>

          {/* Listas Bem Organizadas */}
          <div className="text-center p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400 mb-2">{listsWellOrganized}</p>
            <p className="text-sm text-emerald-300 font-medium mb-1">Listas Organizadas</p>
            <p className="text-xs text-emerald-400/70">Com cards classificados</p>
          </div>

          {/* Listas Precisando Atenção */}
          <div className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-orange-400 mb-2">{listsNeedingAttention}</p>
            <p className="text-sm text-orange-300 font-medium mb-1">Precisam Atenção</p>
            <p className="text-xs text-orange-400/70">Sem classificação</p>
          </div>
        </div>

        {/* Alertas Importantes */}
        <div className="mt-8 space-y-4">
          {listsNeedingAttention > 0 && (
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
              <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-300 text-lg">
                  {listsNeedingAttention} lista{listsNeedingAttention > 1 ? 's' : ''} precisam de classificação
                </p>
                <p className="text-orange-400/80">
                  Considere priorizar a classificação dos cards nessas listas para melhorar a organização
                </p>
              </div>
            </div>
          )}

          {topActType.total_count > 0 && (
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-300 text-lg">
                  "{topActType.name}" é o tipo de ato mais comum
                </p>
                <p className="text-blue-400/80">
                  {topActType.total_count} cards ({Math.round((topActType.total_count / (actTypes.reduce((sum, act) => sum + act.total_count, 0))) * 100)}% do total) - Considere criar processos otimizados para este tipo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
