import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockTaxRates = [
  { code: 'TVA-0', label: 'TVA 0 %', taux: '0 %', pays: 'France', actif: true },
  { code: 'TVA-10', label: 'TVA réduite', taux: '10 %', pays: 'France', actif: true },
  { code: 'TVA-20', label: 'TVA standard', taux: '20 %', pays: 'France', actif: true },
]

export function TaxRatesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">TVA</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Taux de TVA gérés dans l’admin. Les valeurs affichées sont des exemples.
        </p>
      </header>

      <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Taux enregistrés</h2>
          <Button variant="accent" disabled>
            Ajouter un taux
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-memopyk-dark-blue/10">
          <table className="min-w-full text-sm">
            <thead className="bg-memopyk-cream/80 text-left text-memopyk-blue-gray">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Libellé</th>
                <th className="px-4 py-3 font-semibold">Taux</th>
                <th className="px-4 py-3 font-semibold">Pays</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-memopyk-dark-blue/10">
              {mockTaxRates.map((tax) => (
                <tr key={tax.code} className="bg-white text-memopyk-dark-blue">
                  <td className="px-4 py-3 font-medium">{tax.code}</td>
                  <td className="px-4 py-3">{tax.label}</td>
                  <td className="px-4 py-3">{tax.taux}</td>
                  <td className="px-4 py-3">{tax.pays}</td>
                  <td className="px-4 py-3">
                    {tax.actif ? 'Oui' : 'Non'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ComingSoon
        title="Gestion des taux"
        description="Activation/désactivation par pays avec historique des modifications lorsque connecté à `/api/admin/tax-rates`."
      />
    </div>
  )
}
