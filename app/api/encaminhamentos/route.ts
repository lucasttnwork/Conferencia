import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

type MovementRow = {
  occurred_at: string
  card_id: string | null
  action_type: string
  from_list_name: string | null
  to_list_name: string | null
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  // Remove diacríticos usando faixa unicode de combining marks (compatível com ES5)
  const withoutDiacritics = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return withoutDiacritics
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function getMonthKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function fetchAll<T = any>(pathWithQuery: string): Promise<T[]> {
  const pageSize = 1000
  let start = 0
  const acc: any[] = []
  while (true) {
    const end = start + pageSize - 1
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'count=exact',
        Range: `${start}-${end}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Falha ao consultar ${pathWithQuery} [${start}-${end}]`)
    const batch = await res.json()
    acc.push(...batch)
    if (!Array.isArray(batch) || batch.length < pageSize) break
    start += pageSize
  }
  return acc
}

async function fetchCardLabels(cardIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (cardIds.length === 0) return result
  // Passo 1: card_labels
  const uniqueIds = Array.from(new Set(cardIds))
  const chunks: string[][] = []
  const size = 200
  for (let i = 0; i < uniqueIds.length; i += size) chunks.push(uniqueIds.slice(i, i + size))
  const allPairs: Array<{ card_id: string; label_id: string }> = []
  for (const chunk of chunks) {
    const inList = `(${chunk.map((id) => `"${id}"`).join(',')})`
    const pairs = await fetchAll<{ card_id: string; label_id: string }>(`card_labels?select=card_id,label_id&card_id=in.${encodeURIComponent(inList)}`)
    allPairs.push(...pairs)
  }
  const labelIds = Array.from(new Set(allPairs.map((p) => p.label_id)))
  if (labelIds.length === 0) return result
  // Passo 2: labels
  const labelChunks: string[][] = []
  for (let i = 0; i < labelIds.length; i += size) labelChunks.push(labelIds.slice(i, i + size))
  const idToName = new Map<string, string>()
  for (const chunk of labelChunks) {
    const inList = `(${chunk.map((id) => `"${id}"`).join(',')})`
    const rows = await fetchAll<{ id: string; name: string | null }>(`labels?select=id,name&id=in.${encodeURIComponent(inList)}`)
    for (const r of rows) idToName.set(String(r.id), r.name || 'Sem etiqueta')
  }
  for (const p of allPairs) {
    const list = result.get(p.card_id) || []
    const nm = idToName.get(p.label_id) || 'Sem etiqueta'
    list.push(nm)
    result.set(p.card_id, list)
  }
  return result
}

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Configuração do Supabase não encontrada' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ datasets: [] })
    }

    // Buscar movimentos no período
    const filters: string[] = []
    filters.push(`occurred_at=gte.${encodeURIComponent(from)}`)
    filters.push(`occurred_at=lte.${encodeURIComponent(to)}`)
    const qs = filters.length ? `&${filters.join('&')}` : ''
    const rows = await fetchAll<MovementRow>(
      `member_activity?select=occurred_at,card_id,action_type,from_list_name,to_list_name${qs}&action_type=eq.move&order=occurred_at.asc`
    )

    const normalizedRows = rows
      .filter((r) => r.card_id)
      .map((r) => ({
        occurred_at: r.occurred_at,
        card_id: String(r.card_id),
        from: normalizeName(r.from_list_name),
        to: normalizeName(r.to_list_name),
        from_raw: r.from_list_name || '',
        to_raw: r.to_list_name || '',
      }))

    const involvedCardIds = Array.from(new Set(normalizedRows.map((r) => r.card_id)))
    const labelsByCard = await fetchCardLabels(involvedCardIds)

    // Definições de listas (normalizadas)
    const S1_SOURCES = ['triagem', 'entrada', 'pre-conferencia (substituto)', 'pré-conferencia (substituto)', 'pré-conferencia', 'pre-conferencia']
    const S1_TO_AUTH = ['autorizado']
    const S1_TO_PEND_PRE = ['pendencia pre-conferencia', 'pendencia pré-conferencia', 'pendencia pre conferencia', 'pendencia pré conferencia']

    const S3_SOURCES = ['finalizacao externos', 'finalizacao internos', 'finalizacao inventarios', 'finalização externos', 'finalização internos', 'finalização inventarios']
    const TO_IMPRESSAO = ['impressao de traslados', 'impressao de traslado', 'impressao traslados']
    const TO_PEND_SUSP = ['pendencia / emissao de traslados suspensa', 'pendencia emissao de traslados suspensa']

    const SRC_JA_LIB = ['finalizacao externos - traslados ja liberados', 'finalização externos - traslados ja liberados', 'finalizacao externos - traslados já liberados', 'finalização externos – traslados já liberados', 'finalizacao externos – traslados ja liberados']
    const TO_ORG_CONC = ['organizacao de traslado', 'concluido', 'concluidos', 'concluído', 'concluida', 'concluídos']

    const matchesAny = (text: string, needles: string[]) => needles.some((n) => text.includes(n))

    type Agg = Map<string, Map<string, number>> // month -> label -> count
    const makeAgg = (): Agg => new Map<string, Map<string, number>>()
    const inc = (agg: Agg, month: string, label: string, n = 1) => {
      if (!agg.has(month)) agg.set(month, new Map<string, number>())
      const inner = agg.get(month)!
      inner.set(label, (inner.get(label) || 0) + n)
    }

    const agg1 = makeAgg()
    const agg2 = makeAgg()
    const agg3 = makeAgg()
    const agg4 = makeAgg()
    const agg5 = makeAgg()
    const agg6 = makeAgg()

    // Diários
    type DayAgg = Map<string, Map<string, number>> // day -> label -> count
    const makeDayAgg = (): DayAgg => new Map<string, Map<string, number>>()
    const incDay = (agg: DayAgg, day: string, label: string, n = 1) => {
      if (!agg.has(day)) agg.set(day, new Map<string, number>())
      const inner = agg.get(day)!
      inner.set(label, (inner.get(label) || 0) + n)
    }
    const d1 = makeDayAgg()
    const d2 = makeDayAgg()
    const d3 = makeDayAgg()
    const d4 = makeDayAgg()
    const d5 = makeDayAgg()
    const d6 = makeDayAgg()

    for (const r of normalizedRows) {
      const month = getMonthKey(r.occurred_at)
      const day = getDayKey(r.occurred_at)
      const labels = labelsByCard.get(r.card_id) || ['Sem etiqueta']

      // 1) Triagem/Entrada/Pré-Conferência -> Autorizado
      if (matchesAny(r.from, S1_SOURCES) && matchesAny(r.to, S1_TO_AUTH)) {
        for (const lb of labels) { inc(agg1, month, lb); incDay(d1, day, lb) }
      }
      // 2) Triagem/Entrada/Pré-Conferência -> Pendência Pré-Conferência
      if (matchesAny(r.from, S1_SOURCES) && matchesAny(r.to, S1_TO_PEND_PRE)) {
        for (const lb of labels) { inc(agg2, month, lb); incDay(d2, day, lb) }
      }
      // 3) Finalizações -> Impressão de Traslados
      if (matchesAny(r.from, S3_SOURCES) && matchesAny(r.to, TO_IMPRESSAO)) {
        for (const lb of labels) { inc(agg3, month, lb); incDay(d3, day, lb) }
      }
      // 4) Finalizações -> Pendência / Emissão de Traslados Suspensa
      if (matchesAny(r.from, S3_SOURCES) && matchesAny(r.to, TO_PEND_SUSP)) {
        for (const lb of labels) { inc(agg4, month, lb); incDay(d4, day, lb) }
      }
      // 5) Já liberados -> Pendência / Emissão Suspensa
      if (matchesAny(r.from, SRC_JA_LIB) && matchesAny(r.to, TO_PEND_SUSP)) {
        for (const lb of labels) { inc(agg5, month, lb); incDay(d5, day, lb) }
      }
      // 6) Já liberados -> Organização / Concluído
      if (matchesAny(r.from, SRC_JA_LIB) && matchesAny(r.to, TO_ORG_CONC)) {
        for (const lb of labels) { inc(agg6, month, lb); incDay(d6, day, lb) }
      }
    }

    const toSeries = (agg: Agg) => {
      const months = Array.from(agg.keys()).sort()
      const labelSet = new Set<string>()
      for (const m of months) {
        const keys = Array.from(agg.get(m)!.keys())
        for (const lb of keys) labelSet.add(lb)
      }
      const labels = Array.from(labelSet.values()).sort((a, b) => a.localeCompare(b))
      const rows = months.map((m) => {
        const obj: any = { month: m, total: 0 }
        for (const lb of labels) {
          const v = agg.get(m)!.get(lb) || 0
          obj[lb] = v
          obj.total += v
        }
        return obj
      })
      return { months, labels, rows }
    }

    const toSeriesDaily = (agg: DayAgg) => {
      const days = Array.from(agg.keys()).sort()
      const labelSet = new Set<string>()
      for (const d of days) {
        const keys = Array.from(agg.get(d)!.keys())
        for (const lb of keys) labelSet.add(lb)
      }
      const labels = Array.from(labelSet.values()).sort((a, b) => a.localeCompare(b))
      const rows = days.map((d) => {
        const obj: any = { day: d, total: 0 }
        for (const lb of labels) {
          const v = agg.get(d)!.get(lb) || 0
          obj[lb] = v
          obj.total += v
        }
        return obj
      })
      return { days, labels, rows }
    }

    const datasets = [
      { key: 'to_autorizado', title: 'Atos encaminhados para Autorizado', series: toSeries(agg1), seriesDaily: toSeriesDaily(d1) },
      { key: 'to_pend_pre_conf', title: 'Atos encaminhados para Pendência Pré-Conferência', series: toSeries(agg2), seriesDaily: toSeriesDaily(d2) },
      { key: 'to_impressao', title: 'Atos encaminhados para Impressão de Traslados', series: toSeries(agg3), seriesDaily: toSeriesDaily(d3) },
      { key: 'to_pend_susp', title: 'Atos encaminhados para Pendência / Emissão de Traslados Suspensa', series: toSeries(agg4), seriesDaily: toSeriesDaily(d4) },
      { key: 'liberados_to_pend_susp', title: 'Traslados já liberados → Pendência / Emissão Suspensa', series: toSeries(agg5), seriesDaily: toSeriesDaily(d5) },
      { key: 'liberados_to_org_conc', title: 'Traslados já liberados → Organização / Concluído', series: toSeries(agg6), seriesDaily: toSeriesDaily(d6) },
    ]

    return NextResponse.json({ datasets }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('Erro em /api/encaminhamentos:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}


