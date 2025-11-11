import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockProducts = [
  { id: 'prd-001', nom: 'Montage souvenir premium', prix: '850 € HT' },
  { id: 'prd-002', nom: 'Captation événementielle', prix: '1 200 € HT' },
  { id: 'prd-003', nom: 'Option drone', prix: '250 € HT' },
]

export function ProductsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Produits</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Catalogue des prestations MEMOPYK avec tarifs HT. Les données affichées sont mockées en
          attendant la connexion API.
        </p>
      </header>

      <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Aperçu du catalogue</h2>
          <Button variant="accent" disabled>
            Ajouter un produit
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-memopyk-dark-blue/10">
          <table className="min-w-full text-sm">
            <thead className="bg-memopyk-cream/80 text-left text-memopyk-blue-gray">
              <tr>
                <th className="px-4 py-3 font-semibold">Référence</th>
                <th className="px-4 py-3 font-semibold">Prestation</th>
                <th className="px-4 py-3 font-semibold">Tarif HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-memopyk-dark-blue/10">
              {mockProducts.map((product) => (
                <tr key={product.id} className="bg-white text-memopyk-dark-blue">
                  <td className="px-4 py-3 font-medium">{product.id}</td>
                  <td className="px-4 py-3">{product.nom}</td>
                  <td className="px-4 py-3">{product.prix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ComingSoon
        title="Formulaires de gestion à venir"
        description="Création et édition des produits avec validation React Hook Form + Zod lorsque l’API sera branchée."
      />
    </div>
  )
}
