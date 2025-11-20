import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'

export function HomePage() {
  usePageTitle('MEMOPYK Devis — Accueil')

  return (
    <div className="min-h-screen bg-[var(--memopyk-cream)] text-[var(--memopyk-navy)]">
      <header className="border-b border-black/10 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--memopyk-navy)]">
              <span className="text-lg font-semibold text-white">M</span>
            </div>
            <span className="font-semibold tracking-tight text-[var(--memopyk-dark-blue)]">
              MEMOPYK Devis
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link to="/" className="link">
              Accueil
            </Link>
            <Link to="/admin" className="link">
              Administration
            </Link>
            <Link to="/devis/test-id" className="link">
              Éditeur de devis
            </Link>
            <Link to="/p/abc123" className="btn-outline">
              Vue client
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--memopyk-navy)] sm:text-5xl">
            Pilotez vos devis MEMOPYK, simplement et avec style.
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-7 text-[var(--memopyk-blue-gray)]">
            Fondations prêtes pour connecter l’Administration, l’Éditeur de devis et la Vue client.
            Interface en français, code clair en anglais, et palette MEMOPYK appliquée.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/admin" className="btn-primary">
              Accès administration
            </Link>
            <Link to="/devis/test-id" className="btn-secondary">
              Ouvrir l’éditeur
            </Link>
            <Link to="/p/abc123" className="btn-ghost">
              Prévisualiser côté client
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--memopyk-cream)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
          <Feature title="Admin Panel" desc="Produits, Packs, Blocs, TVA, Devises/FX, Branding." />
          <Feature title="Éditeur de devis" desc="Shell prêt pour la collaboration et le temps réel." />
          <Feature
            title="Vue client"
            desc="Parcours public tokenisé avec options alternatives."
          />
        </div>
      </section>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-[var(--memopyk-blue-gray)]">
          © {new Date().getFullYear()} MEMOPYK — Films souvenirs sur mesure.
        </div>
      </footer>
    </div>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[var(--memopyk-dark-blue)]">{title}</h3>
      <p className="mt-2 text-[15px] leading-6 text-[var(--memopyk-blue-gray)]">{desc}</p>
    </div>
  )
}
