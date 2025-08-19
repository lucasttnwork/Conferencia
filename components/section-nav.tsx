'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface SectionNavItem {
  href: string
  label: string
  icon?: ReactNode
}

interface SectionNavProps {
  items: SectionNavItem[]
  pages?: SectionNavItem[]
}

export function SectionNav({ items, pages }: SectionNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl">
          <div className="absolute inset-x-4 top-6 rounded-3xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-white/90 font-medium">Menu</span>
              <button
                aria-label="Fechar menu"
                className="rounded-full p-2 hover:bg-white/10 border border-white/10 text-white/90"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {pages && pages.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {pages.map((p) => {
                    const isActive = p.href === '/' ? pathname === '/' : pathname.startsWith(p.href)
                    return (
                      <a
                        key={p.href}
                        href={p.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-base transition-colors border ${
                          isActive
                            ? 'bg-white/20 text-white border-white/20'
                            : 'text-white/90 bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {p.icon}
                        <span>{p.label}</span>
                      </a>
                    )
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-base text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto px-4 py-3 rounded-2xl backdrop-blur-2xl bg-white/10 dark:bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            {/* Menu hamburguer visível apenas em telas pequenas */}
            <button
              aria-label="Abrir menu"
              className="sm:hidden inline-flex items-center justify-center rounded-full p-2 text-white/90 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {pages && pages.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
                {pages.map((p) => {
                  const isActive = p.href === '/' ? pathname === '/' : pathname.startsWith(p.href)
                  return (
                    <a
                      key={p.href}
                      href={p.href}
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
                          : 'text-white/85 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </a>
                  )
                })}
              </div>
            )}

            <div className="hidden sm:flex gap-2 overflow-x-auto no-scrollbar">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-white/90 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 whitespace-nowrap transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


