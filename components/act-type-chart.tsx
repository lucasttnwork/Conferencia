'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { BarChart3, DollarSign, TrendingUp } from 'lucide-react'

interface ActTypeChartProps {
  actTypes: Array<{
    name: string
    total_count: number
    active_cards: number
    total_value: number
  }>
}

export function ActTypeChart({ actTypes }: ActTypeChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Cores para o gráfico
  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ]

  // Preparar dados para o gráfico
  const chartData = actTypes
    .filter(act => act.total_count > 0)
    .map((act, index) => ({
      name: act.name,
      value: act.total_count,
      color: COLORS[index % COLORS.length],
      total_value: act.total_value
    }))

  // Calcular estatísticas
  const totalCards = actTypes.reduce((sum, act) => sum + act.total_count, 0)
  const totalValue = actTypes.reduce((sum, act) => sum + act.total_value, 0)
  const topActType = actTypes.reduce((max, act) => 
    act.total_count > max.total_count ? act : max, 
    { name: '', total_count: 0, active_cards: 0, total_value: 0 }
  )

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="card-title">Distribuição por Tipo de Ato</h3>
            <p className="card-description">
              Quantidade de cards por categoria de ato notarial
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        {chartData.length > 0 ? (
          <>
            {/* Gráfico */}
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      `${value} cards`,
                      'Quantidade'
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{totalCards}</p>
                <p className="text-sm text-blue-600">Total de Cards</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{actTypes.length}</p>
                <p className="text-sm text-green-600">Tipos de Ato</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
                <p className="text-sm text-purple-600">Valor Total</p>
              </div>
            </div>
            
            {/* Top tipos de ato */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Principais Tipos de Ato
              </h4>
              {actTypes
                .filter(act => act.total_count > 0)
                .sort((a, b) => b.total_count - a.total_count)
                .slice(0, 5)
                .map((act, index) => (
                  <div key={act.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{act.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{act.total_count} cards</p>
                      {act.total_value > 0 && (
                        <p className="text-sm text-gray-600">{formatCurrency(act.total_value)}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum tipo de ato encontrado</p>
            <p className="text-sm text-gray-400">Os cards ainda não foram classificados</p>
          </div>
        )}
      </div>
    </div>
  )
}
