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
}

export function VisualDistribution({ lists, actTypes }: VisualDistributionProps) {
  const [showActTypes, setShowActTypes] = useState(true)
  const [showLists, setShowLists] = useState(true)
  const [expandedActTypes, setExpandedActTypes] = useState(false)
  const [expandedLists, setExpandedLists] = useState(false)

  // Preparar dados para o gráfico de barras dos tipos de ato
  const topActTypes = actTypes
    .filter(act => act.name !== 'Não definido' && act.total_count > 0)
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, expandedActTypes ? undefined : 8)

  // Preparar dados para o gráfico de barras das listas principais
  const topLists = lists
    .filter(list => list.total_cards > 0)
    .sort((a, b) => b.total_cards - a.total_cards)
    .slice(0, expandedLists ? undefined : 8)

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
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                title={showActTypes ? 'Ocultar gráfico' : 'Mostrar gráfico'}
              >
                {showActTypes ? <Eye className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={() => setExpandedActTypes(!expandedActTypes)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-300"
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
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                title={showLists ? 'Ocultar gráfico' : 'Mostrar gráfico'}
              >
                {showLists ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={() => setExpandedLists(!expandedLists)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg border border-green-500/30 hover:from-green-600/30 hover:to-blue-600/30 transition-all duration-300"
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
