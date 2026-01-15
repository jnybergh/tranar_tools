import './globals.css'
import type { Metadata } from 'next'
import Nav from './components/nav'

export const metadata: Metadata = {
  title: 'Tränarverktyg – Lagindelare',
  description: 'Slumpa lag (1 målvakt per lag), flytta spelare med drag & drop och spara historik.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <div className="min-h-screen bg-zinc-950 text-zinc-50">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500/90 to-red-500/30 ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold leading-tight">Tränarverktyg</h1>
                    <div className="text-xs text-zinc-400">U8 • Lagindelare</div>
                  </div>
                </div>
              </div>

              <Nav />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

          <footer className="mt-10 border-t border-white/10 bg-zinc-950">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">
              Lokalt sparad data i webbläsaren (ingen inloggning i denna version).
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
