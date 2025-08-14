'use client'

import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  User, 
  DollarSign, 
  RefreshCw,
  TrendingUp 
} from 'lucide-react'

interface StatsCardsProps {
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

export function StatsCards({ data }: StatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const stats = [
    {
      title: 'Total de Cards',
      value: data.total_cards,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Com Tipo de Ato',
      value: data.cards_with_act_type,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Sem Tipo de Ato',
      value: data.cards_without_act_type,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Com Escrevente',
      value: data.cards_with_clerk,
      icon: User,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Com Valor',
      value: data.cards_with_value,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: 'Valor Total',
      value: formatCurrency(data.total_value),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`card border-2 ${stat.borderColor} ${stat.bgColor} hover:shadow-lg transition-all duration-300`}
          >
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor} ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              
              {stat.title === 'Sem Tipo de Ato' && data.cards_without_act_type > 0 && (
                <div className="mt-3 p-2 bg-orange-100 rounded-md">
                  <p className="text-xs text-orange-700">
                    ⚠️ {data.cards_without_act_type} cards precisam de classificação
                  </p>
                </div>
              )}
              
              {stat.title === 'Com Valor' && data.total_value > 0 && (
                <div className="mt-3 p-2 bg-emerald-100 rounded-md">
                  <p className="text-xs text-emerald-700">
                    💰 Valor médio: {formatCurrency(data.total_value / data.cards_with_value)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
