import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, Palette, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'

const primaryLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/admin', label: 'Administration' },
  { to: '/devis/demo', label: 'Éditeur de devis' },
  { to: '/p/demo-token', label: 'Vue client' },
]

export function MainLayout() {
  const location = useLocation()
  if (location.pathname === '/') {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen flex-col bg-memopyk-cream text-memopyk-navy">
      <header className="border-b border-memopyk-dark-blue/15 bg-memopyk-cream/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 md:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo MEMOPYK" className="h-10 w-auto" />
            <span className="hidden text-lg font-semibold tracking-wide uppercase sm:inline">
              MEMOPYK Devis
            </span>
          </NavLink>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `transition hover:text-memopyk-orange ${
                    isActive ? 'text-memopyk-orange' : 'text-memopyk-navy'
                  }`
                }
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <Button variant="accent" className="hidden md:inline-flex" asChild>
            <NavLink to="/admin">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Accès administrateur
            </NavLink>
          </Button>

          <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu principal">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 md:px-8 md:py-14">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-memopyk-dark-blue/10 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-4 px-4 py-6 text-sm text-memopyk-blue-gray md:flex-row md:items-center md:px-8">
          <p>© {new Date().getFullYear()} MEMOPYK — Films souvenirs sur mesure.</p>
          <div className="flex items-center gap-3">
            <Palette className="h-4 w-4" aria-hidden />
            <span>Palette MEMOPYK appliquée</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
