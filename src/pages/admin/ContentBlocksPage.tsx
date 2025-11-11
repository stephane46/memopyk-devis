import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockBlocks = [
  {
    code: 'intro-histoire',
    titre: 'Notre histoire en quelques mots',
    apercu: 'Depuis 2014, MEMOPYK transforme vos souvenirs en films émouvants…',
  },
  {
    code: 'cta-contact',
    titre: 'Planifier votre tournage',
    apercu: 'Réservez une séance découverte pour définir votre projet.',
  },
]

export function ContentBlocksPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Blocs de contenu</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Textes éditoriaux réutilisables dans les devis. Affichage fictif en attendant les données
          réelles.
        </p>
      </header>

      <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Aperçu des blocs</h2>
          <Button variant="accent" disabled>
            Nouveau bloc
          </Button>
        </div>

        <div className="mt-4 grid gap-4">
          {mockBlocks.map((block) => (
            <div key={block.code} className="rounded-2xl border border-memopyk-dark-blue/10 bg-memopyk-cream/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Code</p>
                  <p className="font-medium text-memopyk-dark-blue">{block.code}</p>
                </div>
                <Button variant="ghost" disabled>
                  Modifier
                </Button>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-memopyk-dark-blue">{block.titre}</h3>
              <p className="mt-2 text-sm text-memopyk-blue-gray">{block.apercu}</p>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon
        title="Édition riche bientôt disponible"
        description="Support Markdown et aperçu en direct pour la rédaction des blocs. Les actions afficheront un formulaire complet après intégration."
      />
    </div>
  )
}
