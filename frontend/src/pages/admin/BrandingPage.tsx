import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAdminBranding, useUpdateAdminBranding } from '../../lib/hooks/useAdminCatalog'

export function BrandingPage() {
  usePageTitle('MEMOPYK Devis — Admin — Branding')

  const { data, isLoading, isError, error, refetch } = useAdminBranding()
  const updateMutation = useUpdateAdminBranding()

  const config = data?.data ?? null

  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [pdfFooterText, setPdfFooterText] = useState('')
  const [defaultValidityDays, setDefaultValidityDays] = useState('')
  const [defaultDepositPct, setDefaultDepositPct] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!config) {
      setCompanyName('')
      setLogoUrl('')
      setPrimaryColor('')
      setSecondaryColor('')
      setPdfFooterText('')
      setDefaultValidityDays('')
      setDefaultDepositPct('')
      return
    }

    setCompanyName(config.company_name ?? '')
    setLogoUrl(config.logo_url ?? '')
    setPrimaryColor(config.primary_color ?? '')
    setSecondaryColor(config.secondary_color ?? '')
    setPdfFooterText(config.pdf_footer_text ?? '')
    setDefaultValidityDays(
      config.default_validity_days != null ? String(config.default_validity_days) : '',
    )
    setDefaultDepositPct(
      config.default_deposit_pct != null ? String(config.default_deposit_pct) : '',
    )
  }, [config?.id])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)

    const payload: any = {
      label: config?.label ?? 'default',
    }

    if (companyName.trim()) payload.company_name = companyName.trim()
    if (logoUrl.trim()) payload.logo_url = logoUrl.trim()
    if (primaryColor.trim()) payload.primary_color = primaryColor.trim()
    if (secondaryColor.trim()) payload.secondary_color = secondaryColor.trim()
    if (pdfFooterText.trim()) payload.pdf_footer_text = pdfFooterText.trim()

    if (defaultValidityDays !== '') {
      const days = Number(defaultValidityDays)
      if (!Number.isFinite(days) || !Number.isInteger(days) || days < 0) {
        setLocalError('Le nombre de jours de validité doit être un entier positif ou nul.')
        return
      }
      payload.default_validity_days = days
    }

    if (defaultDepositPct !== '') {
      const pct = Number(defaultDepositPct)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setLocalError("L'acompte doit être un pourcentage compris entre 0 et 100.")
        return
      }
      payload.default_deposit_pct = pct
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setSuccessMessage('Branding mis à jour avec succès.')
      },
    })
  }

  const apiError = updateMutation.error as (Error & { code?: string }) | null | undefined
  const isSubmitting = updateMutation.isPending

  let apiErrorMessage: string | null = null
  if (apiError?.code === 'validation_error') {
    apiErrorMessage = 'Certaines valeurs sont invalides (jours ou pourcentage hors plage autorisée).'
  } else if (apiError) {
    apiErrorMessage = apiError.message || 'Une erreur est survenue lors de lenregistrement.'
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Branding</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Configurez l’identité visuelle appliquée aux devis et futurs PDF. Ces paramètres sont stockés via
          les endpoints admin de branding.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de branding</CardTitle>
          <CardDescription>
            Définissez le nom de la société, le logo, les couleurs principales ainsi que les paramètres de
            validité et d’acompte par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-sm text-memopyk-blue-gray">
              Chargement…
            </div>
          )}

          {isError && (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Impossible de charger la configuration de branding.</p>
              <p>
                {(error as Error).message ||
                  'Une erreur est survenue lors de la récupération des données. Merci de réessayer.'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-company-name"
                  >
                    Nom de la société
                  </label>
                  <input
                    id="branding-company-name"
                    type="text"
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-logo-url"
                  >
                    URL du logo
                  </label>
                  <input
                    id="branding-logo-url"
                    type="text"
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={logoUrl}
                    onChange={(event) => setLogoUrl(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-primary-color"
                  >
                    Couleur primaire (hex)
                  </label>
                  <input
                    id="branding-primary-color"
                    type="text"
                    placeholder="#011526"
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-secondary-color"
                  >
                    Couleur secondaire (hex)
                  </label>
                  <input
                    id="branding-secondary-color"
                    type="text"
                    placeholder="#2A4759"
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={secondaryColor}
                    onChange={(event) => setSecondaryColor(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-memopyk-navy"
                  htmlFor="branding-footer-text"
                >
                  Texte de pied de page PDF
                </label>
                <textarea
                  id="branding-footer-text"
                  className="min-h-[80px] w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                  value={pdfFooterText}
                  onChange={(event) => setPdfFooterText(event.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-validity-days"
                  >
                    Validité par défaut (jours)
                  </label>
                  <input
                    id="branding-validity-days"
                    type="number"
                    min={0}
                    step={1}
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={defaultValidityDays}
                    onChange={(event) => setDefaultValidityDays(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-memopyk-navy"
                    htmlFor="branding-deposit-pct"
                  >
                    Acompte par défaut (%)
                  </label>
                  <input
                    id="branding-deposit-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                    value={defaultDepositPct}
                    onChange={(event) => setDefaultDepositPct(event.target.value)}
                  />
                </div>
              </div>

              {(localError || apiErrorMessage || successMessage) && (
                <div className="space-y-1 text-sm">
                  {localError && <p className="text-red-600">{localError}</p>}
                  {!localError && apiErrorMessage && <p className="text-red-600">{apiErrorMessage}</p>}
                  {!localError && !apiErrorMessage && successMessage && (
                    <p className="text-emerald-700">{successMessage}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="accent" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement…' : 'Enregistrer le branding'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
