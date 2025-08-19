'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

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

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto px-4 py-3 rounded-2xl backdrop-blur-2xl bg-white/10 dark:bg-white/10 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          {pages && pages.length > 0 && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
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

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
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
  )
}


