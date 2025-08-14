'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, DollarSign, BarChart3 } from 'lucide-react'

interface ListBreakdownProps {
  breakdown: Array<{
    list_id: string
    list_name: string
    list_position: number
    act_type_name: string
    cards_count: number
    total_value: number
  }>
}

export function ListBreakdown({ breakdown }: ListBreakdownProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Agrupar dados por lista
  const groupedByList = breakdown.reduce((acc, item) => {
    if (!acc[item.list_name]) {
      acc[item.list_name] = {
        position: item.list_position,
        items: [],
        totalCards: 0,
        totalValue: 0
      }
    }
    acc[item.list_name].items.push(item)
    acc[item.list_name].totalCards += item.cards_count
    acc[item.list_name].totalValue += item.total_value
    return acc
  }, {} as Record<string, any>)

  // Ordenar listas por posição
  const sortedLists = Object.entries(groupedByList)
    .sort(([, a], [, b]) => a.position - b.position)

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="card-title">Breakdown Detalhado por Lista</h3>
            <p className="card-description">
              Distribuição detalhada de tipos de ato em cada lista
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        {sortedLists.length > 0 ? (
          <div className="space-y-6">
            {sortedLists.map(([listName, listData]) => (
              <div key={listName} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header da lista */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{listName}</h4>
                        <p className="text-sm text-gray-600">
                          Posição {listData.position} • {listData.totalCards} cards
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        Total: {listData.totalCards} cards
                      </p>
                      {listData.totalValue > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          {formatCurrency(listData.totalValue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tabela de breakdown */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-medium text-gray-700">Tipo de Ato</TableHead>
                        <TableHead className="font-medium text-gray-700 text-center">Quantidade</TableHead>
                        <TableHead className="font-medium text-gray-700 text-right">Valor Total</TableHead>
                        <TableHead className="font-medium text-gray-700 text-center">% da Lista</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listData.items
                        .sort((a: any, b: any) => b.cards_count - a.cards_count)
                        .map((item: any, index: number) => {
                          const percentage = Math.round((item.cards_count / listData.totalCards) * 100)
                          return (
                            <TableRow key={`${item.list_id}-${item.act_type_name}`} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ 
                                      backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 60%)` 
                                    }}
                                  />
                                  {item.act_type_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-semibold text-gray-900">{item.cards_count}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                {item.total_value > 0 ? (
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(item.total_value)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-indigo-500 h-2 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600 w-8">{percentage}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Resumo da lista */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        Tipos únicos: {listData.items.length}
                      </span>
                      <span className="text-gray-600">
                        Cards com valor: {listData.items.filter((item: any) => item.total_value > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        Valor médio: {listData.totalCards > 0 
                          ? formatCurrency(listData.totalValue / listData.totalCards)
                          : 'R$ 0,00'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum dado de breakdown encontrado</p>
            <p className="text-sm text-gray-400">Os cards ainda não foram classificados por tipo de ato</p>
          </div>
        )}
      </div>
    </div>
  )
}
