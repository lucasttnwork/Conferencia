'use client'

import { ReactNode } from 'react'

interface SectionNavItem {
  href: string
  label: string
  icon?: ReactNode
}

interface SectionNavProps {
  items: SectionNavItem[]
}

export function SectionNav({ items }: SectionNavProps) {
  return (
    <div className="sticky top-[56px] z-40 bg-gray-900/70 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 whitespace-nowrap transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}


