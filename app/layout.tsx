import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Hockey – Tränarverktyg",
  description: "Lagindelning med rättvis målvaktsrotation."
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <div className="mx-auto max-w-6xl p-4">
          <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Hockey – Tränarverktyg</div>
                <div className="text-sm text-slate-400">U8 • Lag Röd / Lag Svart • Målvaktsrotation</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                MVP
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              <NavLink href="/training" label="Träning" />
              <NavLink href="/players" label="Spelare" />
              <NavLink href="/history" label="Historik" />
            </nav>
          </header>

          <main className="mt-4">{children}</main>

          <footer className="mt-6 text-xs text-slate-500">
            Sparar lokalt i webbläsaren. Backend (Supabase) kan kopplas på senare.
          </footer>
        </div>
      </body>
    </html>
  );
}
