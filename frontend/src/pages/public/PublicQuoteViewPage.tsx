import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'

const mockVersions = [
  {
    id: 'A',
    titre: 'Version principale',
    resume: 'Inclut tournage, montage premium et bande sonore originale.',
    montant: '2 450 € TTC',
  },
  {
    id: 'B',
    titre: 'Option sérénité',
    resume: 'Ajoute un reportage photo et un making-of.',
    montant: '3 100 € TTC',
  },
]

export function PublicQuoteViewPage() {
  const { token } = useParams()

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-memopyk-blue-gray">Espace client sécurisé</p>
        <h1 className="text-3xl font-semibold text-memopyk-dark-blue">Votre devis MEMOPYK</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Token public : <span className="font-medium text-memopyk-dark-blue">{token}</span>
        </p>
      </header>

      <section className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-memopyk-dark-blue">Version actuelle</h2>
        <div className="mt-4 space-y-3 text-sm text-memopyk-blue-gray">
          <p>
            Cette présentation publique permet à vos clients de consulter et accepter le devis.
            L’authentification par PIN et les actions d’acceptation seront activées lors de la connexion à
            l’API.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="accent" disabled>
            Accepter le devis
          </Button>
          <Button variant="outline" disabled>
            Télécharger le PDF
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-memopyk-dark-blue/20 bg-memopyk-cream/70 p-6 text-sm text-memopyk-blue-gray">
        <h2 className="text-lg font-semibold text-memopyk-dark-blue">Voir les autres options</h2>
        <p className="mt-2">
          MEMOPYK propose plusieurs versions de votre projet. Sélectionnez celle qui vous convient le mieux
          lorsqu’elles seront disponibles.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {mockVersions.map((version) => (
            <div key={version.id} className="rounded-2xl border border-memopyk-dark-blue/10 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Option {version.id}</p>
              <h3 className="mt-2 text-lg font-semibold text-memopyk-dark-blue">{version.titre}</h3>
              <p className="mt-2">{version.resume}</p>
              <p className="mt-3 font-semibold text-memopyk-dark-blue">{version.montant}</p>
              <Button className="mt-4" variant="ghost" disabled>
                Choisir cette option
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
