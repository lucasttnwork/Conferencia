'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Navbar() {
    const pathname = usePathname();

    if (pathname === '/formulario') {
        return null;
    }

    return (
        <nav className="sticky top-0 z-50 backdrop-blur bg-gray-900/60 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                <Link href="/" className="text-sm text-gray-300 hover:text-white">Visão Geral</Link>
                <Link href="/produtividade" className="text-sm text-gray-300 hover:text-white">Produtividade</Link>
                <Link href="/solicitacao-acompanhamento" className="text-sm text-gray-300 hover:text-white">Acompanhamento</Link>
            </div>
        </nav>
    );
}
