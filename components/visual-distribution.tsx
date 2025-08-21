'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { BarChart3, List, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

interface VisualDistributionProps {
  lists: Array<{
    id: string
    name: string
    position: number
    total_cards: number
    cards_with_act_type: number
    cards_without_act_type: number
  }>
  actTypes: Array<{
    name: string
    total_count: number
    active_cards: number
    total_value: number
  }>
  createdActTypes?: Array<{
    name: string
    total_count: number
    active_cards: number
    total_value: number
  }>
  createdByList?: Array<{
    list_id: string
    list_name: string
    list_position: number
    total_created: number
  }>
}

export function VisualDistribution({ lists, actTypes, createdActTypes, createdByList }: VisualDistributionProps) {
  const [showActTypes, setShowActTypes] = useState(true)
  const [showLists, setShowLists] = useState(true)
  const [showCreated, setShowCreated] = useState(true)
  const [expandedActTypes, setExpandedActTypes] = useState(false)
  const [expandedLists, setExpandedLists] = useState(false)
  const [expandedCreated, setExpandedCreated] = useState(false)
  const [expandedCreatedByList, setExpandedCreatedByList] = useState(false)

  // Preparar dados para o gráfico de barras dos tipos de ato
  const topActTypes = actTypes
    .filter(act => act.name !== 'Não definido' && act.total_count > 0)
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, expandedActTypes ? undefined : 8)

  // Dados para criados no período (se fornecidos)
  const topCreated = (createdActTypes || [])
    .filter(act => act.name !== 'Não definido' && act.total_count > 0)
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, expandedCreated ? undefined : 8)

  // Preparar dados para o gráfico de barras das listas principais
  const topLists = lists
    .filter(list => list.total_cards > 0)
    .sort((a, b) => b.total_cards - a.total_cards)
    .slice(0, expandedLists ? undefined : 8)

  // Criados por lista (ordenar por total desc por padrão)
  const topCreatedByList = (createdByList || [])
    .filter(l => l.total_created > 0)
    .sort((a, b) => b.total_created - a.total_created)
    .slice(0, expandedCreatedByList ? undefined : 8)

  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#6366F1', '#EC4899', '#14B8A6', '#F43F5E',
    '#A855F7', '#06B6D4', '#84CC16'
  ]

  return (
    <div className="space-y-8">
      {/* Gráfico de Barras - Tipos de Ato */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="card-title">Distribuição por Tipo de Ato</h3>
                <p className="card-description">
                  Principais categorias de atos notariais
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowActTypes(!showActTypes)}
                className="p-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-colors"
                title={showActTypes ? 'Ocultar gráfico' : 'Mostrar gráfico'}
              >
                {showActTypes ? <Eye className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={() => setExpandedActTypes(!expandedActTypes)}
                className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300"
              >
                {expandedActTypes ? 'Ver menos' : 'Ver todos'}
                {expandedActTypes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        {showActTypes && (
          <div className="card-content">
            <div className="h-96 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topActTypes} margin={{ top: 20, right: 40, left: 40, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={11}
                    tick={{ fill: '#9CA3AF' }}
                    interval={0}
                  />
                  <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(75, 85, 99, 0.3)',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: any) => [`${value} cards`, 'Quantidade']}
                  />
                  <Bar 
                    dataKey="total_count" 
                    fill="url(#actTypeGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Top Tipos com cores - Layout melhorado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topActTypes.slice(0, expandedActTypes ? undefined : 9).map((act, index) => (
                <div key={act.name} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-sm text-gray-200 truncate" title={act.name}>
                      {act.name}
                    </span>
                  </div>
                  <span className="font-bold text-blue-400 text-lg ml-3">{act.total_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* A seção de "Criados no Período" virá abaixo de "Cards por Lista" */}

      {/* Gráfico de Barras - Listas Principais */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30">
                <List className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="card-title">Cards por Lista</h3>
                <p className="card-description">
                  Top listas com mais cards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLists(!showLists)}
                className="p-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-colors"
                title={showLists ? 'Ocultar gráfico' : 'Mostrar gráfico'}
              >
                {showLists ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={() => setExpandedLists(!expandedLists)}
                className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300"
              >
                {expandedLists ? 'Ver menos' : 'Ver todas'}
                {expandedLists ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        {showLists && (
          <div className="card-content">
            <div className="h-96 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLists} margin={{ top: 20, right: 40, left: 40, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={11}
                    tick={{ fill: '#9CA3AF' }}
                    interval={0}
                  />
                  <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(75, 85, 99, 0.3)',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: any) => [`${value} cards`, 'Quantidade']}
                  />
                  <Bar 
                    dataKey="total_cards" 
                    fill="url(#listGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Top Listas com cores - Layout melhorado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topLists.slice(0, expandedLists ? undefined : 9).map((list, index) => (
                <div key={list.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-sm text-gray-200 truncate" title={list.name}>
                      {list.name}
                    </span>
                  </div>
                  <div className="text-right ml-3">
                    <span className="font-bold text-green-400 text-lg block">{list.total_cards}</span>
                    <span className="text-xs text-gray-400">
                      {list.cards_with_act_type} classif.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de Barras - Tipos Criados no Período (abaixo de Cards por Lista) */}
      {createdActTypes && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="card-title">Distribuição por Tipo de Ato (Criados no Período)</h3>
                  <p className="card-description">
                    Somente cards criados dentro do período selecionado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreated(!showCreated)}
                  className="p-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-colors"
                  title={showCreated ? 'Ocultar gráfico' : 'Mostrar gráfico'}
                >
                  {showCreated ? <Eye className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                </button>
                <button
                  onClick={() => setExpandedCreated(!expandedCreated)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300"
                >
                  {expandedCreated ? 'Ver menos' : 'Ver todos'}
                  {expandedCreated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {showCreated && (
            <div className="card-content">
              {topCreated.length > 0 ? (
                <>
                  <div className="h-96 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCreated} margin={{ top: 20, right: 40, left: 40, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={11}
                          tick={{ fill: '#9CA3AF' }}
                          interval={0}
                        />
                        <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value: any) => [`${value} cards`, 'Quantidade']}
                        />
                        <Bar 
                          dataKey="total_count" 
                          fill="url(#actTypeGradient)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Tipos criados com cores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topCreated.slice(0, expandedCreated ? undefined : 9).map((act, index) => (
                      <div key={act.name} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-sm text-gray-200 truncate" title={act.name}>
                            {act.name}
                          </span>
                        </div>
                        <span className="font-bold text-blue-400 text-lg ml-3">{act.total_count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-gray-400">Sem dados para o período selecionado</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gráfico de Barras - Criados no Período por Lista */}
      {createdByList && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-lg border border-indigo-500/30">
                  <List className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="card-title">Cards Criados por Lista (no Período)</h3>
                  <p className="card-description">Quantos cards foram criados em cada lista no intervalo selecionado</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedCreatedByList(!expandedCreatedByList)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300"
                >
                  {expandedCreatedByList ? 'Ver menos' : 'Ver todos'}
                  {expandedCreatedByList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="card-content">
            {topCreatedByList.length > 0 ? (
              <>
                <div className="h-96 mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCreatedByList} margin={{ top: 20, right: 40, left: 40, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="list_name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={11}
                        tick={{ fill: '#9CA3AF' }}
                        interval={0}
                      />
                      <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(75, 85, 99, 0.3)',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                        formatter={(value: any) => [`${value} cards`, 'Criados']}
                      />
                      <Bar 
                        dataKey="total_created" 
                        fill="url(#listGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topCreatedByList.slice(0, expandedCreatedByList ? undefined : 9).map((row, index) => (
                    <div key={row.list_id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-sm text-gray-200 truncate" title={row.list_name}>
                          {row.list_name}
                        </span>
                      </div>
                      <span className="font-bold text-indigo-400 text-lg ml-3">{row.total_created}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-24 flex items-center justify-center text-gray-400">Sem dados para o período selecionado</div>
            )}
          </div>
        </div>
      )}

      {/* Gradientes SVG para os gráficos */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="actTypeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="listGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
