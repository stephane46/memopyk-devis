import { NavLink } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-3xl font-semibold text-memopyk-dark-blue">Page introuvable</h1>
      <p className="text-sm text-memopyk-blue-gray">
        Cette page n’existe pas encore ou le lien est erroné. Utilisez la navigation pour retrouver votre
        chemin.
      </p>
      <NavLink
        to="/"
        className="inline-flex rounded-full bg-memopyk-dark-blue px-5 py-2 text-sm font-semibold text-memopyk-cream transition hover:bg-memopyk-navy"
      >
        Retour à l’accueil
      </NavLink>
    </div>
  )
}
