import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tränarverktyg – Lagindelare',
  description: 'Slumpa lag (1 målvakt per lag), flytta spelare med drag & drop och spara historik.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg font-semibold">Tränarverktyg</h1>
                <span className="text-sm text-zinc-500">U8 • Lagindelare</span>
              </div>
              <div className="text-xs text-zinc-500">v0.1</div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mt-10 border-t bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">
              Lokalt sparad data i webbläsaren (ingen inloggning i denna version).
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
