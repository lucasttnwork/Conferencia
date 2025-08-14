'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react'

interface ListBreakdownTableProps {
  breakdown: Array<{
    list_id: string
    list_name: string
    list_position: number
    total_cards_in_list: number
    unique_act_types: number
    classified_cards: number
    unclassified_cards: number
    completion_percentage: number
    act_type_name: string
    cards_count: number
    total_value: number
  }>
}

export function ListBreakdownTable({ breakdown }: ListBreakdownTableProps) {
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
        totalCards: item.total_cards_in_list,
        uniqueActTypes: item.unique_act_types,
        classifiedCards: item.classified_cards,
        unclassifiedCards: item.unclassified_cards,
        completionPercentage: item.completion_percentage,
        actTypes: []
      }
    }
    
    if (item.act_type_name && item.cards_count > 0) {
      acc[item.list_name].actTypes.push({
        name: item.act_type_name,
        count: item.cards_count,
        value: item.total_value
      })
    }
    
    return acc
  }, {} as Record<string, any>)

  // Ordenar listas por posição
  const sortedLists = Object.entries(groupedByList)
    .sort(([, a], [, b]) => a.position - b.position)

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl border border-indigo-500/30">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="card-title">Distribuição por Lista e Tipo de Ato</h3>
            <p className="card-description">
              Contagem detalhada de cards por tipo em cada lista
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        {sortedLists.length > 0 ? (
          <div className="space-y-6">
            {sortedLists.map(([listName, listData]) => (
              <div key={listName} className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-800/30 hover:bg-gray-800/50 transition-all duration-300">
                {/* Header da lista */}
                <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 px-6 py-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                        <FileText className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{listName}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>Posição {listData.position}</span>
                          <span>•</span>
                          <span>{listData.totalCards} cards total</span>
                          <span>•</span>
                          <span>{listData.uniqueActTypes} tipos únicos</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300">
                          {listData.completionPercentage}% completo
                        </span>
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              listData.completionPercentage >= 80 
                                ? 'bg-gradient-to-r from-green-500 to-green-400' 
                                : listData.completionPercentage >= 60 
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' 
                                : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${listData.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          {listData.classifiedCards} classificados
                        </span>
                        {listData.unclassifiedCards > 0 && (
                          <span className="flex items-center gap-1 text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            {listData.unclassifiedCards} pendentes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabela de tipos de ato */}
                {listData.actTypes.length > 0 ? (
                  <div className="overflow-x-auto bg-gray-900/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-800/50 border-gray-700/50">
                          <TableHead className="font-bold text-gray-300">Tipo de Ato</TableHead>
                          <TableHead className="font-bold text-gray-300 text-center">Quantidade</TableHead>
                          <TableHead className="font-bold text-gray-300 text-right">Valor Total</TableHead>
                          <TableHead className="font-bold text-gray-300 text-center">% da Lista</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listData.actTypes
                          .sort((a: any, b: any) => b.count - a.count)
                          .map((actType: any, index: number) => {
                            const percentage = Math.round((actType.count / listData.totalCards) * 100)
                            return (
                              <TableRow key={`${listName}-${actType.name}`} className="hover:bg-gray-800/50 border-gray-700/50">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ 
                                        backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 60%)` 
                                      }}
                                    />
                                    <span className="text-gray-200">{actType.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="font-bold text-white">{actType.count}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {actType.value > 0 ? (
                                    <span className="font-medium text-green-400">
                                      {formatCurrency(actType.value)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="w-20 bg-gray-700 rounded-full h-2 mr-3">
                                      <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-300 w-10">{percentage}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 bg-gray-900/20">
                    <FileText className="w-16 h-16 mx-auto mb-3 text-gray-500" />
                    <p className="text-lg">Nenhum tipo de ato encontrado nesta lista</p>
                  </div>
                )}
                
                {/* Resumo da lista */}
                <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 px-6 py-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                      <span className="text-gray-300">
                        Tipos únicos: {listData.uniqueActTypes}
                      </span>
                      <span className="text-gray-300">
                        Cards com valor: {listData.actTypes.filter((item: any) => item.value > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listData.completionPercentage >= 80 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : listData.completionPercentage >= 60 
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {listData.completionPercentage >= 80 
                          ? 'Bem organizada' 
                          : listData.completionPercentage >= 60 
                          ? 'Necessita atenção' 
                          : 'Requer ação imediata'
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
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhum dado de breakdown encontrado</p>
            <p className="text-sm text-gray-500">As listas ainda não possuem cards classificados</p>
          </div>
        )}
      </div>
    </div>
  )
}
