'use client'

import { useState } from 'react'
import { FileText, CheckCircle, AlertTriangle, BarChart3, TrendingUp, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

interface ListPivotData {
  list_name: string
  list_position: number
  total_cards: number
  "Escritura de Venda e Compra": number
  "Procuração": number
  "Escritura Pública de Inventário e Partilha": number
  "Escritura de Doação": number
  "Ata Notarial para Usucapião": number
  "Escritura de Procuração": number
  "Escritura de Sobrepartilha": number
  "Escritura de Divórcio": number
  "Testamento": number
  "Retificação e Ratificação": number
  "Escritura de Nomeação de inventariante": number
  "Escritura de Inventário e Partilha": number
  "Escritura de Confissão de Dívida": number
  "Escritura de Dação em pagamento": number
  "Declaração de União Estável": number
  "Escritura de Compra e Venda": number
  "Escritura de Divórcio Direto": number
  "Escritura Pública de Inventário e Partilha de Bens": number
  "Ata de Retificativa": number
  "Escritura de Inventário": number
  "Escritura de Venda e Compra com alienação fiduciária": number
  "Escritura Pública de Inventário e Adjudicação": number
  "Escritura de Permuta": number
  "Escritura de Venda e Compra com cláusula resolutiva": number
  "Escritura Pública de Cessão de Direitos Creditórios": number
  "Revogação de Procuração": number
  "Escritura de procuração": number
  "Escritura Pública de Confissão de Dívida": number
  "Escritura de Doação com Reserva de Usufruto": number
  "Ata Notarial": number
  "Ata Retificativa": number
  "Escritura de Reconhecimento e Dissolução de União Estável": number
  "Escritura de Restabelecimento de Sociedade Conjugal": number
  "Escritura de Declaração de união estável": number
  "Não definido": number
  "Total Classificados": number
  "Percentual Classificados": number
}

interface ListPivotTableProps {
  data: ListPivotData[]
}

export function ListPivotTable({ data }: ListPivotTableProps) {
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(true)

  // Ordenar por posição da lista
  const sortedData = [...data].sort((a, b) => a.list_position - b.list_position)

  // Obter tipos de ato mais comuns para destacar
  const getTopActTypes = (row: ListPivotData) => {
    const actTypes = [
      'Escritura de Venda e Compra',
      'Procuração',
      'Escritura Pública de Inventário e Partilha',
      'Escritura de Doação',
      'Ata Notarial para Usucapião',
      'Escritura de Procuração',
      'Escritura de Sobrepartilha',
      'Escritura de Divórcio',
      'Testamento',
      'Retificação e Ratificação'
    ]

    return actTypes
      .map(type => ({ 
        name: type, 
        count: (row as any)[type] || 0 
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400 bg-green-500/20 border-green-500/30'
    if (percentage >= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    return 'text-red-400 bg-red-500/20 border-red-500/30'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-4 h-4" />
    if (percentage >= 60) return <AlertTriangle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const toggleList = (listName: string) => {
    const newExpanded = new Set(expandedLists)
    if (newExpanded.has(listName)) {
      newExpanded.delete(listName)
    } else {
      newExpanded.add(listName)
    }
    setExpandedLists(newExpanded)
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl border border-indigo-500/30">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="card-title">Distribuição por Lista - Visão Pivot</h3>
              <p className="card-description">
                Uma linha por lista com contagem de cada tipo de ato
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            title={showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          >
            {showDetails ? <Eye className="w-5 h-5 text-indigo-400" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
          </button>
        </div>
      </div>
      
      <div className="card-content">
        {sortedData.length > 0 ? (
          <div className="space-y-4">
            {sortedData.map((list) => {
              const topActTypes = getTopActTypes(list)
              const hasUnclassified = list["Não definido"] > 0
              const isExpanded = expandedLists.has(list.list_name)
              
              return (
                <div key={list.list_name} className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-800/30 hover:bg-gray-800/50 transition-all duration-300">
                  {/* Header da lista */}
                  <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 px-6 py-4 border-b border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                          <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">{list.list_name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-300">
                            <span>Posição {list.list_position}</span>
                            <span>•</span>
                            <span>{list.total_cards} cards total</span>
                            <span>•</span>
                            <span>{list["Total Classificados"]} classificados</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(list["Percentual Classificados"])}`}>
                            {list["Percentual Classificados"]}% completo
                          </span>
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                list["Percentual Classificados"] >= 80 
                                  ? 'bg-gradient-to-r from-green-500 to-green-400' 
                                  : list["Percentual Classificados"] >= 60 
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' 
                                  : 'bg-gradient-to-r from-red-500 to-red-400'
                              }`}
                              style={{ width: `${list["Percentual Classificados"]}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            {list["Total Classificados"]} classificados
                          </span>
                          {hasUnclassified && (
                            <span className="flex items-center gap-1 text-orange-400">
                              <AlertTriangle className="w-3 h-3" />
                              {list["Não definido"]} pendentes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top tipos de ato */}
                  {topActTypes.length > 0 && (
                    <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-500/20">
                      <h5 className="font-bold text-blue-300 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Principais tipos de ato nesta lista:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topActTypes.map((actType) => (
                          <div key={actType.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-blue-500/20 hover:bg-gray-800/70 transition-colors">
                            <span className="text-sm font-medium text-gray-200 truncate flex-1" title={actType.name}>
                              {actType.name}
                            </span>
                            <span className="font-bold text-blue-400 ml-3">
                              {actType.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Botão para expandir/colapsar detalhes */}
                  <div className="p-4 bg-gray-800/20 border-t border-gray-700/50">
                    <button
                      onClick={() => toggleList(list.list_name)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-gray-700/50 to-gray-600/50 hover:from-gray-700/70 hover:to-gray-600/70 rounded-lg transition-all duration-300 border border-gray-600/50 hover:border-gray-500/50"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-5 h-5 text-gray-300" />
                          <span className="text-gray-300 font-medium">Ocultar detalhes completos</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-5 h-5 text-gray-300" />
                          <span className="text-gray-300 font-medium">Ver detalhes completos</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Detalhes expandidos */}
                  {isExpanded && showDetails && (
                    <div className="p-6 bg-gray-900/30">
                      <h6 className="font-bold text-gray-300 mb-4">Detalhes dos Tipos de Ato:</h6>
                      <div className="space-y-3">
                        {Object.entries(list)
                          .filter(([key, value]) => 
                            key !== 'list_name' && 
                            key !== 'list_position' && 
                            key !== 'total_cards' && 
                            key !== 'Total Classificados' && 
                            key !== 'Percentual Classificados' &&
                            typeof value === 'number' && 
                            value > 0
                          )
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([actType, count]) => {
                            const percentage = Math.round((count as number / list.total_cards) * 100)
                            return (
                              <div key={actType} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-4 h-4 rounded-full"
                                    style={{ 
                                      backgroundColor: `hsl(${(Math.random() * 360)}, 70%, 60%)` 
                                    }}
                                  />
                                  <span className="text-gray-200">{actType}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-bold text-white">{count}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-300 w-10">{percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                  
                  {/* Resumo da lista */}
                  <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 px-6 py-4 border-t border-gray-700/50">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-6">
                        <span className="text-gray-300">
                          Tipos únicos: {Object.keys(list).filter(key => 
                            key !== 'list_name' && 
                            key !== 'list_position' && 
                            key !== 'total_cards' && 
                            key !== 'Total Classificados' && 
                            key !== 'Percentual Classificados' &&
                            typeof list[key as keyof ListPivotData] === 'number' && 
                            (list[key as keyof ListPivotData] as number) > 0
                          ).length}
                        </span>
                        <span className="text-gray-300">
                          Cards com valor: {/* Implementar quando houver dados de valor */}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        {getStatusIcon(list["Percentual Classificados"])}
                        <span>
                          {list["Percentual Classificados"] >= 80 
                            ? 'Lista bem organizada' 
                            : list["Percentual Classificados"] >= 60 
                            ? 'Necessita atenção' 
                            : 'Requer ação imediata'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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
