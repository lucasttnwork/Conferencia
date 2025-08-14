'use client'

import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  onRefresh: () => void
  loading?: boolean
}

export function RefreshButton({ onRefresh, loading = false }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Atualizando...' : 'Atualizar'}
    </button>
  )
}
