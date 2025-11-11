import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockBundles = [
  {
    code: 'pack-prestige',
    nom: 'Pack Prestige Mariage',
    reduction: '10 %',
    contenu: ['Captation événementielle', 'Montage souvenir premium', 'Option drone'],
  },
  {
    code: 'pack-entreprise',
    nom: 'Pack Lancement Entreprise',
    reduction: '15 %',
    contenu: ['Storytelling teaser', 'Montage express', 'Captation studio'],
  },
]

export function BundlesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Packs</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Composition de packs produits avec remise automatique. Les données sont fictives pour
          illustrer la structure.
        </p>
      </header>

      <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Aperçu des packs</h2>
          <Button variant="accent" disabled>
            Créer un pack
          </Button>
        </div>

        <div className="mt-4 grid gap-4">
          {mockBundles.map((bundle) => (
            <div
              key={bundle.code}
              className="rounded-2xl border border-memopyk-dark-blue/10 bg-memopyk-cream/70 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Code</p>
                  <p className="font-medium text-memopyk-dark-blue">{bundle.code}</p>
                </div>
                <div className="rounded-full bg-memopyk-dark-blue px-4 py-1 text-xs font-semibold text-memopyk-cream">
                  Réduction {bundle.reduction}
                </div>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-memopyk-dark-blue">{bundle.nom}</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-memopyk-blue-gray">
                {bundle.contenu.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-3">
                <Button variant="ghost" disabled>
                  Modifier
                </Button>
                <Button variant="outline" disabled>
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon
        title="Gestion atomique des packs"
        description="Chaque pack sauvegardera ses éléments dans une transaction unique avec suivi d’activité une fois relié à l’API."
      />
    </div>
  )
}
