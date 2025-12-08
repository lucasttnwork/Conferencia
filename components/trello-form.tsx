'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle2, Loader2, FileText, Hash, Clock, AlignLeft, Send, ChevronDown } from 'lucide-react';

export function TrelloForm() {
    const [actTypes, setActTypes] = useState<string[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [formData, setFormData] = useState({
        tipoAto: '',
        protocolo: '',
        dataEntrega: '',
        extras: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchActTypes = async () => {
            try {
                const response = await fetch('/api/trello/act-types');
                if (response.ok) {
                    const data = await response.json();
                    setActTypes(data.actTypes);
                }
            } catch (error) {
                console.error('Failed to fetch act types', error);
            } finally {
                setLoadingTypes(false);
            }
        };

        fetchActTypes();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch('/api/trello/create-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao enviar formulário');
            }

            setStatus('success');
            // Reset form but keep status as success for the overlay
            setFormData({
                tipoAto: '',
                protocolo: '',
                dataEntrega: '',
                extras: ''
            });

        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message);
        }
    };

    const handleReset = () => {
        setStatus('idle');
    }

    const calculateMinDate = () => {
        const now = new Date();
        now.setDate(now.getDate() + 2);
        return now.toISOString().slice(0, 10);
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-2xl mx-auto min-h-[500px] flex flex-col items-center justify-center p-8 rounded-2xl border border-gray-700/50 bg-[#112240]/80 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-green-500/20 via-green-400/20 to-blue-500/20 pointer-events-none -z-10" />

                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>

                <h2 className="text-3xl font-bold text-gray-100 mb-3 text-center">Solicitação Enviada!</h2>
                <p className="text-gray-400 text-center max-w-md mb-8">
                    O card foi criado com sucesso na coluna de Triagem. A equipe foi notificada.
                </p>

                <button
                    onClick={handleReset}
                    className="py-3 px-8 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl border border-gray-700 transition-all flex items-center gap-2"
                >
                    Nova Solicitação
                </button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl border border-gray-700/50 bg-[#112240]/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Gradient Border Effect - Blue Tones Only */}
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-gray-500/20 pointer-events-none -z-10" />

            {/* Header */}
            <div className="mb-8 border-b border-gray-700/50 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">Dados do Ato</h2>
                </div>
                <p className="text-gray-400 text-sm ml-11">
                    Selecione o tipo de ato e preencha os detalhes.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="tipoAto" className="text-sm font-medium text-gray-300 ml-1">
                            Tipo de Ato
                        </label>
                        <div className="relative group">
                            <select
                                id="tipoAto"
                                name="tipoAto"
                                required
                                disabled={loadingTypes}
                                className="w-full pl-4 pr-10 py-3.5 bg-[#1E293B]/60 backdrop-blur-md border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none text-gray-200 placeholder:text-gray-600 appearance-none disabled:opacity-50 hover:bg-[#1E293B]/80 shadow-lg"
                                value={formData.tipoAto}
                                onChange={handleChange}
                            >
                                <option value="" disabled>Selecione um ato...</option>
                                {actTypes.map((type) => (
                                    <option key={type} value={type} className="bg-gray-900 text-gray-200 py-2">{type}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none text-gray-500">
                                {loadingTypes ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="protocolo" className="text-sm font-medium text-gray-300 ml-1">
                                Número de Protocolo
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500">
                                    <Hash className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    id="protocolo"
                                    name="protocolo"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-[#0A192F]/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none text-gray-200 placeholder:text-gray-600"
                                    placeholder="000000"
                                    value={formData.protocolo}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="dataEntrega" className="text-sm font-medium text-gray-300 ml-1">
                                Data para Entrega
                            </label>
                            <div className="relative group cursor-pointer">
                                <span className="absolute left-4 top-3.5 text-gray-500 pointer-events-none z-10">
                                    <Calendar className="w-4 h-4" />
                                </span>
                                <input
                                    type="date"
                                    id="dataEntrega"
                                    name="dataEntrega"
                                    required
                                    min={calculateMinDate()}
                                    className="w-full pl-10 pr-4 py-3 bg-[#1E293B]/60 backdrop-blur-md border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none text-gray-200 [color-scheme:dark] hover:bg-[#1E293B]/80 shadow-lg cursor-pointer relative z-0"
                                    value={formData.dataEntrega}
                                    onChange={handleChange}
                                    onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                                />
                            </div>
                            <p className="text-xs text-blue-400/80 flex items-center gap-1.5 ml-1 mt-1.5">
                                <Clock className="w-3 h-3" />
                                Mínimo de 48h (2 dias) de prazo
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="extras" className="text-sm font-medium text-gray-300 ml-1">
                            Informações Extras
                        </label>
                        <div className="relative group">
                            <span className="absolute left-4 top-3.5 text-gray-500">
                                <AlignLeft className="w-4 h-4" />
                            </span>
                            <textarea
                                id="extras"
                                name="extras"
                                rows={4}
                                className="w-full pl-10 pr-4 py-3 bg-[#0A192F]/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all outline-none resize-none text-gray-200 placeholder:text-gray-600"
                                placeholder="Observações..."
                                value={formData.extras}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {status === 'error' && (
                    <div className="p-4 bg-red-900/20 border border-red-500/20 text-red-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-sm">{errorMessage}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        <>
                            <span>Enviar Solicitação</span>
                            <Send className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
