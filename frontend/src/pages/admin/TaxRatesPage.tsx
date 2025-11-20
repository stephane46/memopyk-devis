import { useState, type FormEvent } from 'react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { usePageTitle } from '../../lib/usePageTitle'
import {
  useAdminTaxRates,
  useCreateAdminTaxRate,
  useUpdateAdminTaxRate,
} from '../../lib/hooks/useAdminCatalog'
import type { AdminTaxRate } from '../../lib/api'

function formatRatePct(rateBps: number): string {
  const value = rateBps / 100
  if (Number.isInteger(value)) {
    return `${value} %`
  }
  return `${value.toFixed(2)} %`
}

interface TaxRateFormProps {
  mode: 'create' | 'edit'
  initialRate?: AdminTaxRate | null
  onDone: () => void
}

function TaxRateForm({ mode, initialRate, onDone }: TaxRateFormProps) {
  const [name, setName] = useState(initialRate?.name ?? '')
  const [code, setCode] = useState(initialRate?.code ?? '')
  const [ratePct, setRatePct] = useState(
    initialRate ? String(initialRate.rate_bps / 100) : '20',
  )
  const [isDefault, setIsDefault] = useState<boolean>(initialRate?.is_default ?? false)
  const [localError, setLocalError] = useState<string | null>(null)

  const createMutation = useCreateAdminTaxRate()
  const updateMutation = useUpdateAdminTaxRate()

  const isEditing = mode === 'edit' && !!initialRate
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function getActiveError(): Error & { code?: string } | null {
    const err = (mode === 'create' ? createMutation.error : updateMutation.error) as
      | (Error & { code?: string })
      | null
      | undefined
    return err ?? null
  }

  const apiError = getActiveError()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    const numericRate = Number(ratePct.replace(',', '.'))

    if (!trimmedName || !trimmedCode || !Number.isFinite(numericRate)) {
      setLocalError('Merci de renseigner un nom, un code et un taux valide.')
      return
    }

    const rateBps = Math.round(numericRate * 100)

    const payload = {
      name: trimmedName,
      code: trimmedCode,
      rate_bps: rateBps,
      is_default: isDefault,
    }

    if (isEditing && initialRate) {
      updateMutation.mutate(
        { id: initialRate.id, payload },
        {
          onSuccess: () => {
            onDone()
          },
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setName('')
          setCode('')
          setRatePct('20')
          setIsDefault(false)
          onDone()
        },
      })
    }
  }

  let apiErrorMessage: string | null = null
  if (apiError?.code === 'tax_rate_code_conflict') {
    apiErrorMessage = 'Ce code de TVA existe déjà. Merci d’en choisir un autre.'
  } else if (apiError?.code === 'validation_error') {
    apiErrorMessage = 'Certaines valeurs sont invalides. Merci de vérifier le formulaire.'
  } else if (apiError) {
    apiErrorMessage = apiError.message || 'Une erreur est survenue lors de lenregistrement.'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Modifier un taux de TVA' : 'Ajouter un taux de TVA'}</CardTitle>
        <CardDescription>
          Définissez un code, un libellé et un taux en pourcentage. Un seul taux peut être marqué comme par
          défaut à la fois.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="tax-name">
                Libellé
              </label>
              <input
                id="tax-name"
                type="text"
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="tax-code">
                Code interne
              </label>
              <input
                id="tax-code"
                type="text"
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="tax-rate">
                Taux (%)
              </label>
              <input
                id="tax-rate"
                type="number"
                min={0}
                max={25}
                step={0.1}
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={ratePct}
                onChange={(event) => setRatePct(event.target.value)}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-memopyk-navy">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-memopyk-blue-gray/60 text-memopyk-dark-blue"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
              Définir comme taux par défaut
            </label>
          </div>

          {(localError || apiErrorMessage) && (
            <p className="text-sm text-red-600">{localError || apiErrorMessage}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Enregistrement…'
                  : 'Création…'
                : isEditing
                  ? 'Enregistrer les modifications'
                  : 'Créer le taux'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => onDone()}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function TaxRatesPage() {
  usePageTitle('MEMOPYK Devis — Admin — TVA')

  const { data, isLoading, isError, error, refetch } = useAdminTaxRates()
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [selectedRate, setSelectedRate] = useState<AdminTaxRate | null>(null)

  const rates = data?.data ?? []

  function openCreateForm() {
    setSelectedRate(null)
    setFormMode('create')
  }

  function openEditForm(rate: AdminTaxRate) {
    setSelectedRate(rate)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setSelectedRate(null)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">TVA</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Configurez les taux de TVA utilisés dans les devis MEMOPYK. Un seul taux peut être marqué comme
          par défaut.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Taux enregistrés</CardTitle>
            <CardDescription>Liste des taux actifs exposés par l’API admin.</CardDescription>
          </div>
          <Button variant="accent" onClick={openCreateForm}>
            Ajouter un taux
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-sm text-memopyk-blue-gray">
              Chargement…
            </div>
          )}

          {isError && (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Impossible de charger les taux de TVA.</p>
              <p>
                {(error as Error).message ||
                  'Une erreur est survenue lors de la récupération des données. Merci de réessayer.'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {!isLoading && !isError && rates.length === 0 && (
            <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-memopyk-cream/60 px-4 py-6 text-sm text-memopyk-blue-gray">
              Aucun taux de TVA n’est encore configuré. Ajoutez un premier taux pour commencer.
            </div>
          )}

          {!isLoading && !isError && rates.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-memopyk-dark-blue/10">
              <table className="min-w-full text-sm">
                <thead className="bg-memopyk-cream/80 text-left text-memopyk-blue-gray">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold text-right">Taux</th>
                    <th className="px-4 py-3 font-semibold text-right">Par défaut</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-memopyk-dark-blue/10">
                  {rates.map((rate) => (
                    <tr key={rate.id} className="bg-white text-memopyk-dark-blue">
                      <td className="px-4 py-3 font-medium">{rate.name}</td>
                      <td className="px-4 py-3">{rate.code}</td>
                      <td className="px-4 py-3 text-right">{formatRatePct(rate.rate_bps)}</td>
                      <td className="px-4 py-3 text-right">
                        {rate.is_default && (
                          <span className="inline-flex items-center rounded-full bg-memopyk-dark-blue/10 px-2.5 py-0.5 text-xs font-medium text-memopyk-dark-blue">
                            Par défaut
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(rate)}
                        >
                          Modifier
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {formMode && (
        <TaxRateForm
          mode={formMode}
          initialRate={formMode === 'edit' ? selectedRate ?? undefined : undefined}
          onDone={closeForm}
        />
      )}
    </div>
  )
}
