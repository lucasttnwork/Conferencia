'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DashboardHeader } from '@/components/dashboard-header'
import { StatsOverview } from '@/components/stats-overview'
import { VisualDistribution } from '@/components/visual-distribution'
import { QuickInsights } from '@/components/quick-insights'
import { ListBreakdownTable } from '@/components/list-breakdown-table'
import { ListPivotTable } from '@/components/list-pivot-table'
import { LoadingSpinner } from '@/components/loading-spinner'
import { OpenCardsTable } from '@/components/open-cards-table'
import { SectionNav } from '@/components/section-nav'
import { Gauge, LayoutList, Layers3, Table2, ListChecks, Lightbulb } from 'lucide-react'
import { LoginScreen } from '@/components/login-screen'

interface DashboardData {
  overall: {
    total_cards: number
    cards_with_act_type: number
    cards_without_act_type: number
    cards_with_clerk: number
    cards_with_value: number
    total_value: number
    cards_needing_reconference: number
  }
  lists: Array<{
    id: string
    name: string
    position: number
    total_cards: number
    cards_with_act_type: number
    cards_without_act_type: number
  }>
  act_types: Array<{
    name: string
    total_count: number
    active_cards: number
    total_value: number
  }>
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
  pivot: Array<{
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
  }>
  summary: Array<{
    list_name: string
    list_position: number
    total_cards: number
    classified_cards: number
    unclassified_cards: number
    unique_act_types: number
    completion_percentage: number
    status: string
  }>
  open_cards: Array<{
    id: string
    name: string
    act_type: string | null
    act_value: number | null
    clerk_name: string | null
    current_list_id: string | null
    list_name: string | null
    list_position: number | null
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard')
      }

      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Realtime: revalidar quando eventos afetarem listas/cards
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const supabase = createClient(url, key)
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_events' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('dashboard_auth_token')
      if (token === 'conf_2024_secure_access') {
        setIsAuthenticated(true)
      }
      setIsAuthChecking(false)
    }
    checkAuth()
  }, [])

  const handleLogin = (success: boolean) => {
    if (success) {
      localStorage.setItem('dashboard_auth_token', 'conf_2024_secure_access')
      setIsAuthenticated(true)
    }
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center glass-effect p-8 rounded-2xl border border-red-500/30">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Erro ao carregar dashboard</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 neon-glow"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader
        lastUpdated={lastUpdated}
        onRefresh={fetchDashboardData}
      />

      {/* Navegação entre seções */}
      <SectionNav
        items={[
          { href: '#overview', label: 'Visão Geral', icon: <Gauge className="w-4 h-4 text-blue-400" /> },
          { href: '#distribution', label: 'Distribuição', icon: <Layers3 className="w-4 h-4 text-green-400" /> },
          { href: '#insights', label: 'Insights', icon: <Lightbulb className="w-4 h-4 text-yellow-400" /> },
          { href: '#pivot', label: 'Pivot por Lista', icon: <Table2 className="w-4 h-4 text-indigo-400" /> },
          { href: '#breakdown', label: 'Detalhamento', icon: <LayoutList className="w-4 h-4 text-purple-400" /> },
          { href: '#open-cards', label: 'Cards Abertos', icon: <ListChecks className="w-4 h-4 text-pink-400" /> },
        ]}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Visão Geral Compacta */}
        <section id="overview" className="scroll-mt-28">
          <StatsOverview data={data.overall} />
        </section>

        {/* Distribuição Visual */}
        <section id="distribution" className="scroll-mt-28">
          <VisualDistribution
            lists={data.lists}
            actTypes={data.act_types}
          />
        </section>

        {/* Insights Rápidos */}
        <section id="insights" className="scroll-mt-28">
          <QuickInsights
            breakdown={data.breakdown}
            actTypes={data.act_types}
          />
        </section>

        {/* NOVA VISÃO: Tabela Pivot - Uma linha por lista */}
        <section id="pivot" className="scroll-mt-28">
          <ListPivotTable data={data.pivot} />
        </section>

        {/* Visão detalhada (opcional) */}
        <section id="breakdown" className="scroll-mt-28">
          <ListBreakdownTable breakdown={data.breakdown} />
        </section>

        {/* Lista completa de cards abertos */}
        <section id="open-cards" className="scroll-mt-28">
          <OpenCardsTable cards={data.open_cards} />
        </section>
      </div>
    </div>
  )
}
