'use client'

import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  User, 
  DollarSign, 
  TrendingUp 
} from 'lucide-react'

interface StatsOverviewProps {
  data: {
    total_cards: number
    cards_with_act_type?: number
    cards_without_act_type?: number
    cards_with_clerk?: number
    cards_with_value: number
    total_value: number
    cards_needing_reconference?: number
    opened_cards?: number
    archived_cards?: number
    completed_cards?: number
  }
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total de Cards */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-blue-300 text-sm font-medium mb-2">Total de Cards</p>
            <p className="text-4xl font-bold text-white mb-1">{data.total_cards.toLocaleString('pt-BR')}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full animate-pulse-glow"></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Cards abertos no período */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-green-300 text-sm font-medium mb-2">Cards abertos</p>
            <p className="text-4xl font-bold text-white mb-1">{(data.opened_cards || 0).toLocaleString('pt-BR')}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full animate-pulse-glow"></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Cards concluídos no período */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-orange-300 text-sm font-medium mb-2">Cards concluídos</p>
            <p className="text-4xl font-bold text-white mb-1">{(data.completed_cards || 0).toLocaleString('pt-BR')}</p>
            <p className="text-orange-300 text-sm mb-2">Chegaram na lista "Concluídos" no período</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full animate-pulse-glow"></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/30">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Em andamento no fim do período */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-purple-300 text-sm font-medium mb-2">Em andamento</p>
            <p className="text-3xl font-bold text-white mb-1">{(data as any).in_progress_cards?.toLocaleString('pt-BR') || '0'}</p>
            <p className="text-purple-300 text-sm mb-2">Abertos em "{new Date().getFullYear()}" fim do período e não concluídos</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full animate-pulse-glow"></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30">
            <DollarSign className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
