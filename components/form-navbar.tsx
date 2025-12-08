'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Printer } from 'lucide-react';

export function FormNavbar() {
    const pathname = usePathname();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A192F]/80 backdrop-blur-md border-b border-gray-700/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                            C
                        </div>
                        <span className="text-gray-200 font-semibold text-lg hidden sm:block">Cartório Paulista</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-4">
                        <Link
                            href="/solicitacao-conferencia"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/solicitacao-conferencia'
                                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:block">Conferência</span>
                        </Link>

                        <Link
                            href="/solicitacao-impressao"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/solicitacao-impressao'
                                    ? 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                }`}
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:block">Impressão</span>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
