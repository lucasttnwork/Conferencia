'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, CheckCircle2, Clock, ExternalLink, Loader2, Search, History } from 'lucide-react';
import { FormNavbar } from '@/components/form-navbar';

type CardResult = {
    id: string;
    name: string;
    listName: string;
    shortUrl?: string;
    dateLastActivity?: string;
};

type TimelineEntry = {
    id: string;
    type: 'create' | 'move';
    date: string;
    fromListName?: string;
    toListName?: string;
    memberName?: string;
};

type CardDetailsResponse = {
    card: {
        id: string;
        name: string;
        listId?: string;
        listName?: string | null;
        shortUrl?: string;
        dateLastActivity?: string;
    };
    timeline: TimelineEntry[];
};

const formatDateTime = (value?: string) => {
    if (!value) return '—';
    try {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(value));
    } catch {
        return value;
    }
};

export default function SolicitacaoAcompanhamentoPage() {
    const [protocolo, setProtocolo] = useState('');
    const [cards, setCards] = useState<CardResult[]>([]);
    const [selectedCard, setSelectedCard] = useState<CardResult | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [cardDetails, setCardDetails] = useState<CardDetailsResponse['card'] | null>(null);

    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasSearched = useMemo(() => cards.length > 0 || error !== null, [cards, error]);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError(null);
        setCards([]);
        setTimeline([]);
        setSelectedCard(null);
        setCardDetails(null);

        const sanitizedProtocol = protocolo.replace(/\D/g, '');
        if (!sanitizedProtocol) {
            setError('Informe o número de protocolo.');
            return;
        }

        try {
            setLoadingSearch(true);
            const res = await fetch(`/api/trello/search-cards?protocolo=${sanitizedProtocol}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || 'Falha ao buscar cards.');
            }

            const results: CardResult[] = data.cards || [];
            setCards(results);

            if (results.length === 1) {
                await loadTimeline(results[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar cards.');
        } finally {
            setLoadingSearch(false);
        }
    };

    const loadTimeline = async (card: CardResult) => {
        setSelectedCard(card);
        setTimeline([]);
        setCardDetails(null);
        setError(null);
        try {
            setLoadingTimeline(true);
            const res = await fetch(`/api/trello/card-movements?cardId=${card.id}`);
            const data: CardDetailsResponse | { error?: string } = await res.json();

            if (!res.ok) {
                throw new Error((data as any)?.error || 'Falha ao buscar timeline.');
            }

            setCardDetails(data.card);
            setTimeline(data.timeline);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar timeline.');
        } finally {
            setLoadingTimeline(false);
        }
    };

    // Prefetch timeline if cards array contains previously selected id
    useEffect(() => {
        if (selectedCard && !timeline.length && !loadingTimeline) {
            // Already handled by loadTimeline on selection; noop guard
        }
    }, [selectedCard, timeline.length, loadingTimeline]);

    return (
        <main className="min-h-screen bg-[#0A192F] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-start relative overflow-hidden pt-24">
            <FormNavbar />

            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-5xl w-full mx-auto relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 via-gray-300 to-gray-400 bg-clip-text text-transparent mb-3">
                        Acompanhamento de Solicitação
                    </h1>
                    <p className="text-lg text-blue-300/80 font-light">
                        Busque pelo número de protocolo e visualize o caminho do card no Trello.
                    </p>
                </div>

                <form
                    onSubmit={handleSearch}
                    className="mb-8 p-6 rounded-2xl border border-gray-700/50 bg-[#112240]/80 backdrop-blur-xl shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-gray-500/20 pointer-events-none -z-10" />
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={protocolo}
                                onChange={(e) => setProtocolo(e.target.value.replace(/\D/g, ''))}
                                placeholder="Digite o número do protocolo"
                                className="w-full pl-12 pr-4 py-3 bg-[#0A192F]/60 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none text-gray-100 placeholder:text-gray-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loadingSearch}
                            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loadingSearch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            <span>{loadingSearch ? 'Buscando...' : 'Buscar'}</span>
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 text-red-200 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                </form>

                <div className="space-y-6">
                    {hasSearched && cards.length === 0 && !loadingSearch && !error && (
                        <div className="p-6 rounded-2xl border border-gray-700/50 bg-[#0A192F]/50 text-center text-gray-300">
                            Nenhum card encontrado para o protocolo informado.
                        </div>
                    )}

                    {cards.length > 0 && (
                        <div className="grid gap-4">
                            <div className="text-sm text-gray-400">
                                {cards.length} {cards.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        className={`p-4 rounded-xl border ${selectedCard?.id === card.id ? 'border-blue-500/60 bg-[#112240]/80' : 'border-gray-700/50 bg-[#0A192F]/40'
                                            } shadow-lg transition-all`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-gray-400">Nome do Card</p>
                                                <h3 className="text-lg font-semibold text-gray-100">{card.name}</h3>
                                                <p className="text-sm text-blue-300 mt-1">Lista atual: {card.listName}</p>
                                                {card.dateLastActivity && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Última atividade: {formatDateTime(card.dateLastActivity)}
                                                    </p>
                                                )}
                                            </div>
                                            {card.shortUrl && (
                                                <a
                                                    href={card.shortUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1"
                                                >
                                                    Trello <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => loadTimeline(card)}
                                            className="mt-4 w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            disabled={loadingTimeline && selectedCard?.id === card.id}
                                        >
                                            {loadingTimeline && selectedCard?.id === card.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando timeline...
                                                </>
                                            ) : (
                                                <>
                                                    <History className="w-4 h-4" /> Ver timeline
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedCard && (
                        <div className="p-6 rounded-2xl border border-gray-700/50 bg-[#112240]/70 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-sm text-gray-400">Card selecionado</p>
                                    <h3 className="text-xl font-semibold text-gray-100">{selectedCard.name}</h3>
                                    {cardDetails?.listName && (
                                        <p className="text-sm text-blue-300">Lista atual: {cardDetails.listName}</p>
                                    )}
                                </div>
                            </div>

                            {loadingTimeline && (
                                <div className="py-6 flex items-center justify-center text-gray-300 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Carregando timeline...
                                </div>
                            )}

                            {!loadingTimeline && timeline.length > 0 && (
                                <div className="relative pl-6">
                                    <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/40 via-blue-400/40 to-transparent" />
                                    <div className="space-y-4">
                                        {timeline.map((event, idx) => (
                                            <div key={event.id} className="relative">
                                                <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-blue-400 ring-4 ring-blue-500/20" />
                                                <div className="bg-[#0A192F]/60 border border-gray-700/50 rounded-xl p-4 shadow">
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{formatDateTime(event.date)}</span>
                                                        {event.memberName && (
                                                            <span className="text-gray-500">• por {event.memberName}</span>
                                                        )}
                                                    </div>
                                                    {event.type === 'create' && (
                                                        <p className="text-gray-100 text-sm">
                                                            Card criado na lista <span className="text-blue-300 font-medium">{event.toListName}</span>.
                                                        </p>
                                                    )}
                                                    {event.type === 'move' && (
                                                        <div className="flex flex-wrap items-center gap-2 text-gray-100 text-sm">
                                                            <span>Movido de</span>
                                                            <span className="text-blue-300 font-medium">{event.fromListName}</span>
                                                            <ArrowRightLeft className="w-4 h-4 text-blue-300" />
                                                            <span>para</span>
                                                            <span className="text-blue-300 font-medium">{event.toListName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!loadingTimeline && timeline.length === 0 && (
                                <div className="text-sm text-gray-400">
                                    Nenhuma movimentação encontrada para este card.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
