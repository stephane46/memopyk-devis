import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockFxSnapshot = [
  { base: 'EUR', quote: 'USD', taux: '1.08', date: '05/10/2025 12:00' },
  { base: 'EUR', quote: 'GBP', taux: '0.86', date: '05/10/2025 12:00' },
  { base: 'EUR', quote: 'CHF', taux: '0.98', date: '05/10/2025 12:00' },
]

export function CurrenciesFxPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Devises / FX</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Instantané des taux de change utilisés pour convertir les devis MEMOPYK. Remplacement total
          prévu via `/api/admin/fx-snapshot`.
        </p>
      </header>

      <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Snapshot du 05/10/2025</h2>
          <div className="flex gap-3">
            <Button variant="outline" disabled>
              Importer un CSV
            </Button>
            <Button variant="accent" disabled>
              Mettre à jour maintenant
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-memopyk-dark-blue/10">
          <table className="min-w-full text-sm">
            <thead className="bg-memopyk-cream/80 text-left text-memopyk-blue-gray">
              <tr>
                <th className="px-4 py-3 font-semibold">Devise de base</th>
                <th className="px-4 py-3 font-semibold">Devise cotée</th>
                <th className="px-4 py-3 font-semibold">Taux</th>
                <th className="px-4 py-3 font-semibold">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-memopyk-dark-blue/10">
              {mockFxSnapshot.map((rate) => (
                <tr key={`${rate.base}-${rate.quote}`} className="bg-white text-memopyk-dark-blue">
                  <td className="px-4 py-3 font-medium">{rate.base}</td>
                  <td className="px-4 py-3">{rate.quote}</td>
                  <td className="px-4 py-3">{rate.taux}</td>
                  <td className="px-4 py-3">{rate.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ComingSoon
        title="Chargement automatique des taux"
        description="Remplacement atomique du snapshot avec journalisation des activités administrateur lors de l’intégration."
      />
    </div>
  )
}
