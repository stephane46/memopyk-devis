import { useState, type FormEvent } from 'react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { usePageTitle } from '../../lib/usePageTitle'
import { formatMoney } from '../../lib/format'
import {
  useAdminProducts,
  useAdminTaxRates,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from '../../lib/hooks/useAdminCatalog'
import type { AdminProduct, AdminTaxRate } from '../../lib/api'

function formatRatePct(rateBps: number): string {
  const value = rateBps / 100
  if (Number.isInteger(value)) {
    return `${value} %`
  }
  return `${value.toFixed(2)} %`
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  initialProduct?: AdminProduct | null
  taxRates: AdminTaxRate[]
  onDone: () => void
}

function ProductForm({ mode, initialProduct, taxRates, onDone }: ProductFormProps) {
  const [internalCode, setInternalCode] = useState(initialProduct?.internal_code ?? '')
  const [name, setName] = useState(initialProduct?.name ?? '')
  const [description, setDescription] = useState(initialProduct?.description ?? '')
  const [priceEuros, setPriceEuros] = useState(
    initialProduct && initialProduct.default_unit_price_cents != null
      ? String(initialProduct.default_unit_price_cents / 100)
      : '',
  )
  const [taxRateSelection, setTaxRateSelection] = useState(
    initialProduct?.default_tax_rate_id ?? '',
  )
  const [localError, setLocalError] = useState<string | null>(null)

  const createMutation = useCreateAdminProduct()
  const updateMutation = useUpdateAdminProduct()

  const isEditing = mode === 'edit' && !!initialProduct
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function getActiveError(): (Error & { code?: string }) | null {
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
    if (!trimmedName) {
      setLocalError('Le nom du produit est requis.')
      return
    }

    const numericPrice = Number(priceEuros.replace(',', '.'))
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setLocalError('Le prix doit être un nombre positif (en euros).')
      return
    }

    const priceCents = Math.round(numericPrice * 100)
    const trimmedCode = internalCode.trim()
    const trimmedDescription = description.trim()

    let defaultTaxRateId: string | null | undefined
    if (taxRateSelection === '') {
      defaultTaxRateId = undefined
    } else if (taxRateSelection === 'none') {
      defaultTaxRateId = null
    } else {
      defaultTaxRateId = taxRateSelection
    }

    if (isEditing && initialProduct) {
      const payload: any = {
        name: trimmedName,
        default_unit_price_cents: priceCents,
      }

      if (trimmedCode) {
        payload.internal_code = trimmedCode
      }
      if (trimmedDescription) {
        payload.description = trimmedDescription
      }
      if (defaultTaxRateId !== undefined) {
        payload.default_tax_rate_id = defaultTaxRateId
      }

      updateMutation.mutate(
        { id: initialProduct.id, payload },
        {
          onSuccess: () => {
            onDone()
          },
        },
      )
    } else {
      const payload: any = {
        name: trimmedName,
        default_unit_price_cents: priceCents,
      }

      if (trimmedCode) {
        payload.internal_code = trimmedCode
      }
      if (trimmedDescription) {
        payload.description = trimmedDescription
      }
      if (defaultTaxRateId !== undefined) {
        payload.default_tax_rate_id = defaultTaxRateId
      }

      createMutation.mutate(payload, {
        onSuccess: () => {
          setInternalCode('')
          setName('')
          setDescription('')
          setPriceEuros('')
          setTaxRateSelection('')
          onDone()
        },
      })
    }
  }

  let apiErrorMessage: string | null = null
  if (apiError?.code === 'validation_error') {
    apiErrorMessage = 'Certaines valeurs sont invalides. Merci de vérifier les champs obligatoires.'
  } else if (apiError?.code === 'invalid_tax_rate_id') {
    apiErrorMessage = 'Le taux de TVA sélectionné nest pas valide.'
  } else if (apiError) {
    apiErrorMessage = apiError.message || 'Une erreur est survenue lors de lenregistrement.'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Modifier un produit' : 'Ajouter un produit'}</CardTitle>
        <CardDescription>
          Gérez les prestations MEMOPYK, leurs tarifs HT et le taux de TVA par défaut associé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="product-code">
                Code interne (optionnel)
              </label>
              <input
                id="product-code"
                type="text"
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={internalCode}
                onChange={(event) => setInternalCode(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="product-name">
                Nom du produit
              </label>
              <input
                id="product-name"
                type="text"
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-memopyk-navy"
              htmlFor="product-description"
            >
              Description (optionnelle)
            </label>
            <textarea
              id="product-description"
              className="min-h-[80px] w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="product-price">
                Prix unitaire HT (en euros)
              </label>
              <input
                id="product-price"
                type="number"
                min={0}
                step={0.01}
                className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={priceEuros}
                onChange={(event) => setPriceEuros(event.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-memopyk-navy"
                htmlFor="product-tax-rate"
              >
                Taux de TVA par défaut
              </label>
              <select
                id="product-tax-rate"
                className="w-full rounded-full border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
                value={taxRateSelection}
                onChange={(event) => setTaxRateSelection(event.target.value)}
              >
                <option value="">Aucun (non spécifié)</option>
                <option value="none">Aucun (forcer aucun taux)</option>
                {taxRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} ({formatRatePct(rate.rate_bps)})
                  </option>
                ))}
              </select>
            </div>
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
                  : 'Créer le produit'}
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

export function ProductsPage() {
  usePageTitle('MEMOPYK Devis — Admin — Produits')

  const { data: productsData, isLoading, isError, error, refetch } = useAdminProducts()
  const { data: taxRatesData } = useAdminTaxRates()

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null)

  const products = productsData?.data ?? []
  const taxRates = taxRatesData?.data ?? []

  function openCreateForm() {
    setSelectedProduct(null)
    setFormMode('create')
  }

  function openEditForm(product: AdminProduct) {
    setSelectedProduct(product)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setSelectedProduct(null)
  }

  function getTaxRateName(product: AdminProduct): string {
    if (!product.default_tax_rate_id) return '—'
    const rate = taxRates.find((r) => r.id === product.default_tax_rate_id)
    return rate?.name ?? '—'
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Produits</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Gérez le catalogue des prestations MEMOPYK et leurs tarifs HT. Ces données pourront ensuite être
          reliées aux lignes de devis.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Catalogue des produits</CardTitle>
            <CardDescription>Liste des produits actifs exposés par l’API admin.</CardDescription>
          </div>
          <Button variant="accent" onClick={openCreateForm}>
            Ajouter un produit
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
              <p className="font-medium">Impossible de charger les produits.</p>
              <p>
                {(error as Error).message ||
                  'Une erreur est survenue lors de la récupération des données. Merci de réessayer.'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-memopyk-cream/60 px-4 py-6 text-sm text-memopyk-blue-gray">
              Aucun produit nest encore configuré. Ajoutez une première prestation pour démarrer votre
              catalogue.
            </div>
          )}

          {!isLoading && !isError && products.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-memopyk-dark-blue/10">
              <table className="min-w-full text-sm">
                <thead className="bg-memopyk-cream/80 text-left text-memopyk-blue-gray">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Code interne</th>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Prix unitaire HT</th>
                    <th className="px-4 py-3 font-semibold">TVA par défaut</th>
                    <th className="px-4 py-3 font-semibold">Actif</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-memopyk-dark-blue/10">
                  {products.map((product) => (
                    <tr key={product.id} className="bg-white text-memopyk-dark-blue">
                      <td className="px-4 py-3 text-sm text-memopyk-blue-gray">
                        {product.internal_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3">
                        {formatMoney(product.default_unit_price_cents ?? 0, 'EUR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-memopyk-blue-gray">
                        {getTaxRateName(product)}
                      </td>
                      <td className="px-4 py-3">
                        {product.is_active && (
                          <span className="inline-flex items-center rounded-full bg-memopyk-dark-blue/10 px-2.5 py-0.5 text-xs font-medium text-memopyk-dark-blue">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(product)}
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
        <ProductForm
          mode={formMode}
          initialProduct={formMode === 'edit' ? selectedProduct ?? undefined : undefined}
          taxRates={taxRates}
          onDone={closeForm}
        />
      )}
    </div>
  )
}
