import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useMatches } from 'react-router'
import { Sidebar } from './Sidebar'

export type RouteHandle = { title?: string }

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const matches = useMatches()
  const title =
    [...matches].reverse().map((m) => (m.handle as RouteHandle | undefined)?.title).find(Boolean) ??
    'Bruvet'

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <h1 className="truncate text-lg font-semibold">{title}</h1>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-7xl p-4 sm:p-6 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
