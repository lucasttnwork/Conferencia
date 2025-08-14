'use client'

import { RefreshCw, TrendingUp, Zap } from 'lucide-react'
import { useState } from 'react'

interface DashboardHeaderProps {
  lastUpdated: Date | null
  onRefresh: () => Promise<void>
}

export function DashboardHeader({ lastUpdated, onRefresh }: DashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl border border-blue-500/30">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Dashboard de Atos Notariais
            </h1>
          </div>
          <div className="flex items-center gap-6 mt-3">
            <p className="text-gray-300 text-lg">
              Sistema de monitoramento e análise em tempo real
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-gray-300 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700/50">
              <span className="text-gray-400">Atualizado:</span> {formatTime(lastUpdated)} - {formatDate(lastUpdated)}
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 neon-glow border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
