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
    cards_with_act_type: number
    cards_without_act_type: number
    cards_with_clerk: number
    cards_with_value: number
    total_value: number
    cards_needing_reconference: number
  }
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const completionRate = Math.round((data.cards_with_act_type / data.total_cards) * 100)

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

      {/* Taxa de Completude */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-green-300 text-sm font-medium mb-2">Classificados</p>
            <p className="text-4xl font-bold text-white mb-1">{completionRate}%</p>
            <p className="text-green-300 text-sm mb-2">{data.cards_with_act_type} de {data.total_cards}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Pendentes */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-orange-300 text-sm font-medium mb-2">Pendentes</p>
            <p className="text-4xl font-bold text-white mb-1">{data.cards_without_act_type.toLocaleString('pt-BR')}</p>
            <p className="text-orange-300 text-sm mb-2">Aguardando classificação</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full animate-pulse-glow"></div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/30">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Valor Total */}
      <div className="card animate-float neon-glow">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <p className="text-purple-300 text-sm font-medium mb-2">Valor Total</p>
            <p className="text-3xl font-bold text-white mb-1">{formatCurrency(data.total_value)}</p>
            <p className="text-purple-300 text-sm mb-2">{data.cards_with_value} cards com valor</p>
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
