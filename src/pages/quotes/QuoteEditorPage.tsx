import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

export function QuoteEditorPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Éditeur de devis</h1>
          <p className="text-sm text-memopyk-blue-gray">
            Travail en cours sur le devis <span className="font-medium text-memopyk-dark-blue">{id}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            Voir la version PDF
          </Button>
          <Button variant="accent" disabled>
            Sauvegarder maintenant
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Sections principales</h2>
          <ul className="mt-4 space-y-3 text-sm text-memopyk-blue-gray">
            <li>Informations client et statut du devis.</li>
            <li>Versions disponibles avec totaux HT / TTC.</li>
            <li>Blocs éditoriaux et notes internes.</li>
          </ul>
        </div>
        <ComingSoon
          title="Construction de devis en direct"
          description="L’éditeur offrira édition en ligne, autosave, et synchronisation offline grâce aux endpoints `/api/quotes/*`."
        />
      </div>
    </div>
  )
}
