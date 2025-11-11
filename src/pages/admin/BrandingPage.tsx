import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'

const mockBranding = {
  logo: '/logo.svg',
  couleurs: {
    primaire: '#011526',
    secondaire: '#2A4759',
    accent: '#D67C4A',
  },
  typographie: 'Work Sans / Inter',
}

export function BrandingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Branding</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Configurez l’identité visuelle appliquée aux devis et futurs PDF. Prévisualisation en direct à
          venir.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Paramètres actuels (mock)</h2>
          <div className="mt-4 space-y-4 text-sm text-memopyk-dark-blue">
            <div>
              <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Logo</p>
              <div className="mt-2 flex items-center gap-4">
                <img src={mockBranding.logo} alt="Logo MEMOPYK" className="h-14 w-auto rounded-xl border" />
                <Button variant="outline" disabled>
                  Modifier le logo
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Couleurs</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(mockBranding.couleurs).map(([label, hex]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 rounded-full border border-memopyk-dark-blue/15"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-sm">
                      <span className="font-medium capitalize">{label}</span>
                      <span className="ml-1 text-memopyk-blue-gray">{hex}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Typographie</p>
              <p className="mt-1 font-medium">{mockBranding.typographie}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-memopyk-dark-blue/25 bg-memopyk-cream/60 p-6">
          <h2 className="text-lg font-semibold text-memopyk-dark-blue">Prévisualisation à venir</h2>
          <p className="mt-2 text-sm text-memopyk-blue-gray">
            Cette zone affichera un aperçu en direct du futur PDF et de la page publique. Les mises à jour
            seront instantanées une fois que le backend de branding sera connecté.
          </p>
        </div>
      </div>

      <ComingSoon
        title="Prévisualisation en direct"
        description="Connexion future à `/api/admin/branding` pour enregistrer et appliquer l’identité graphique."
      />
    </div>
  )
}
