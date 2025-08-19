import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard de Atos Notariais',
  description: 'Sistema de monitoramento e análise de atos notariais',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100`}>
        <nav className="sticky top-0 z-50 backdrop-blur bg-gray-900/60 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <a href="/" className="text-sm text-gray-300 hover:text-white">Visão Geral</a>
            <a href="/produtividade" className="text-sm text-gray-300 hover:text-white">Produtividade</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
