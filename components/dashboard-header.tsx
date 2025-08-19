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
    <div className="mb-8 mt-16 sm:mt-20 lg:mt-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
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
            <div className="text-sm text-white/90 px-4 py-2 rounded-full backdrop-blur-2xl bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
              <span className="text-gray-400">Atualizado:</span> {formatTime(lastUpdated)} - {formatDate(lastUpdated)}
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-white/90 hover:text-white backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
