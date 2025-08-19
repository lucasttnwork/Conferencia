'use client'

import { useMemo, useState } from 'react'

type OpenCard = {
  id: string
  name: string
  act_type: string | null
  act_value: number | null
  clerk_name: string | null
  current_list_id: string | null
  list_name: string | null
  list_position: number | null
}

interface OpenCardsTableProps {
  cards: OpenCard[]
}

export function OpenCardsTable({ cards }: OpenCardsTableProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = q
      ? cards.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.act_type || '').toLowerCase().includes(q) ||
          (c.list_name || '').toLowerCase().includes(q)
        )
      : cards
    return items.sort((a, b) => (a.list_position || 0) - (b.list_position || 0))
  }, [cards, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toBRL = (value: number | null) => {
    if (value == null) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">Cards abertos no Trello</h3>
            <p className="card-description">Listagem completa dos cards não arquivados</p>
          </div>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Buscar por título, tipo ou lista..."
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-72"
          />
        </div>
      </div>
      <div className="card-content overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="py-2 pr-4">Título</th>
              <th className="py-2 pr-4">Lista</th>
              <th className="py-2 pr-4">Tipo de Ato</th>
              <th className="py-2 pr-4">Valor</th>
              <th className="py-2 pr-4">Escrevente</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(card => (
              <tr key={card.id} className="border-b border-gray-900">
                <td className="py-2 pr-4">{card.name}</td>
                <td className="py-2 pr-4 text-gray-300">{card.list_name || '-'}</td>
                <td className="py-2 pr-4">{card.act_type || 'Não definido'}</td>
                <td className="py-2 pr-4">{toBRL(card.act_value)}</td>
                <td className="py-2 pr-4 text-gray-300">{card.clerk_name || '-'}</td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td className="py-4 text-gray-400" colSpan={5}>Nenhum card encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card-footer flex items-center justify-between text-sm text-gray-400">
        <span>
          Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button
            className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Próxima</button>
        </div>
      </div>
    </div>
  )
}


