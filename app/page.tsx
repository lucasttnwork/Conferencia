'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DashboardHeader } from '@/components/dashboard-header'
import { StatsOverview } from '@/components/stats-overview'
import { VisualDistribution } from '@/components/visual-distribution'
import { QuickInsights } from '@/components/quick-insights'
import { ListKanban } from '@/components/list-kanban'
import { LoadingSpinner } from '@/components/loading-spinner'
import { OpenCardsTable } from '@/components/open-cards-table'
import { SectionNav } from '@/components/section-nav'
import { Gauge, LayoutList, Layers3, Table2, ListChecks, Lightbulb } from 'lucide-react'
import PeriodSelect from '@/components/period-select'
import DatePicker from '@/components/date-picker'

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
  const [period, setPeriod] = useState<'7d' | '30d' | '60d' | '90d' | 'custom'>('30d')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')

  // Utilitários de período (mesma lógica da página de Produtividade)
  const startOfLocalDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const endOfLocalDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
  }
  const parseLocalYmd = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }
  const buildFilter = (): { fromIso: string; toIso: string } | null => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return null
      const fromLocal = startOfLocalDay(parseLocalYmd(customStart))
      const toLocal = endOfLocalDay(parseLocalYmd(customEnd))
      if (isNaN(fromLocal.getTime()) || isNaN(toLocal.getTime())) return null
      return { fromIso: fromLocal.toISOString(), toIso: toLocal.toISOString() }
    }
    const now = new Date()
    const map: Record<'7d' | '30d' | '60d' | '90d', number> = { '7d': 7, '30d': 30, '60d': 60, '90d': 90 }
    const days = map[period]
    const toLocal = endOfLocalDay(now)
    const fromAnchor = new Date(startOfLocalDay(now))
    fromAnchor.setDate(fromAnchor.getDate() - (days - 1))
    const fromLocal = startOfLocalDay(fromAnchor)
    return { fromIso: fromLocal.toISOString(), toIso: toLocal.toISOString() }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const range = buildFilter()
      const qs = range ? `?from=${encodeURIComponent(range.fromIso)}&to=${encodeURIComponent(range.toIso)}` : ''
      const response = await fetch(`/api/dashboard${qs}`, { cache: 'no-store' })
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
  }, [period, customStart, customEnd])

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
    <div className="min-h-screen p-4 lg:p-6 pt-20 sm:pt-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader 
        lastUpdated={lastUpdated}
        onRefresh={fetchDashboardData}
      />

      {/* Navegação entre seções */}
      <SectionNav
        pages={[
          { href: '/', label: 'Visão Geral' },
          { href: '/produtividade', label: 'Produtividade' },
        ]}
        items={[
          { href: '#overview', label: 'Visão Geral', icon: <Gauge className="w-4 h-4 text-blue-400" /> },
          { href: '#distribution', label: 'Distribuição', icon: <Layers3 className="w-4 h-4 text-green-400" /> },
          { href: '#insights', label: 'Insights', icon: <Lightbulb className="w-4 h-4 text-yellow-400" /> },
          { href: '#kanban', label: 'Kanban por Lista', icon: <Table2 className="w-4 h-4 text-indigo-400" /> },
          { href: '#open-cards', label: 'Cards Abertos', icon: <ListChecks className="w-4 h-4 text-pink-400" /> },
        ]}
      />

      {/* Seleção de período */}
      <div className="max-w-7xl mx-auto mt-6 mb-4 flex items-center gap-2 justify-end">
        <PeriodSelect value={period} onChange={setPeriod as any} />
        {period === 'custom' && (
          <>
            <DatePicker value={customStart} onChange={setCustomStart} />
            <DatePicker value={customEnd} onChange={setCustomEnd} />
          </>
        )}
      </div>
      
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
        
        {/* Visão Kanban por Lista */}
        <section id="kanban" className="scroll-mt-28">
          <ListKanban data={data.pivot as any} />
        </section>
        
        {/* Seção de detalhamento removida (Kanban cobre os dados) */}

        {/* Lista completa de cards abertos */}
        <section id="open-cards" className="scroll-mt-28">
          <OpenCardsTable cards={data.open_cards} />
        </section>
      </div>
    </div>
  )
}
