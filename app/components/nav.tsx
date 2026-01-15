'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/training', label: 'Träning' },
  { href: '/players', label: 'Spelare' },
  { href: '/history', label: 'Historik' }
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'px-3 py-1.5 text-sm rounded-xl transition ' +
              (active
                ? 'bg-red-500/15 text-red-200 ring-1 ring-red-500/30'
                : 'text-zinc-300 hover:bg-white/5 hover:text-zinc-100')
            }
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
