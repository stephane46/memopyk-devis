import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Palette, Shield, ShoppingBag, Store, Wallet } from 'lucide-react'
import { cn } from '../lib/utils'

const adminLinks = [
  { to: '/admin/products', label: 'Produits', icon: ShoppingBag },
  { to: '/admin/bundles', label: 'Packs', icon: Store },
  { to: '/admin/content-blocks', label: 'Blocs de contenu', icon: Building2 },
  { to: '/admin/tax-rates', label: 'TVA', icon: Shield },
  { to: '/admin/currencies-fx', label: 'Devises / FX', icon: Wallet },
  { to: '/admin/branding', label: 'Branding', icon: Palette },
]

export function AdminLayout() {
  return (
    <div className="flex min-h-[70vh] flex-col gap-8 md:flex-row md:gap-12">
      <aside className="md:w-72">
        <div className="rounded-3xl border border-memopyk-dark-blue/20 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Administration</h2>
          <p className="mt-1 text-sm text-memopyk-blue-gray">
            Gérer le catalogue, les taxes, les devises et l’identité visuelle de MEMOPYK.
          </p>
          <nav className="mt-6 flex flex-col gap-2 text-sm">
            {adminLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-full px-4 py-3 transition',
                    isActive
                      ? 'bg-memopyk-dark-blue text-memopyk-cream shadow-sm'
                      : 'text-memopyk-dark-blue hover:bg-memopyk-dark-blue/10',
                  )
                }
                end
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <section className="flex-1">
        <Outlet />
      </section>
    </div>
  )
}
