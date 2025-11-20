import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateQuote } from '../../../lib/hooks/useQuotes'
import { useAdminBranding } from '../../../lib/hooks/useAdminCatalog'

export default function CreateQuotePage() {
  const navigate = useNavigate()
  const createMutation = useCreateQuote()
  const brandingQuery = useAdminBranding()

  const brandingConfig = brandingQuery.data?.data ?? null

  const [title, setTitle] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [summary, setSummary] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [validUntil, setValidUntil] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !customerName.trim()) {
      return
    }

    createMutation.mutate(
      {
        title: title.trim(),
        customer_name: customerName.trim(),
        notes: summary.trim() || undefined,
        currency: (currency.trim() || 'EUR').toUpperCase(),
        lines: [
          {
            description: title.trim(),
            qty: 1,
            unit_amount_cents: 0,
            tax_rate_bps: 0,
          },
        ],
      },
      {
        onSuccess: (createdQuote) => {
          navigate(`/admin/quotes/${createdQuote.id}`, {
            state: { justCreated: true },
          })
        },
      },
    )
  }

  const isSubmitting = createMutation.isPending

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-memopyk-navy">Nouveau devis</h1>
      <p className="mb-4 text-memopyk-blue-gray">
        Crée un premier devis MEMOPYK en renseignant les informations principales du client. Tu pourras ensuite
        ajouter des lignes et des versions détaillées.
      </p>

      {brandingConfig && (
        <div className="mb-6 rounded-xl bg-memopyk-cream/70 px-3 py-2 text-xs text-memopyk-blue-gray">
          {brandingConfig.default_validity_days != null && (
            <p>Validité par défaut : {brandingConfig.default_validity_days} jours</p>
          )}
          {brandingConfig.default_deposit_pct != null && (
            <p>Acompte par défaut : {brandingConfig.default_deposit_pct} %</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="quote-title">
            Titre du devis *
          </label>
          <input
            id="quote-title"
            type="text"
            className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="quote-customer">
            Nom du client *
          </label>
          <input
            id="quote-customer"
            type="text"
            className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="quote-summary">
            Résumé (optionnel)
          </label>
          <textarea
            id="quote-summary"
            className="min-h-[80px] w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="quote-currency">
              Devise
            </label>
            <input
              id="quote-currency"
              type="text"
              className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-memopyk-navy" htmlFor="quote-valid-until">
              Valide jusqu’au (optionnel)
            </label>
            <input
              id="quote-valid-until"
              type="date"
              className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-600">
            Une erreur est survenue lors de la création du devis. Merci de réessayer.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-full bg-memopyk-orange px-4 py-2 font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Création…' : 'Créer le devis'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/quotes')}
            className="inline-flex items-center rounded-full border border-memopyk-blue-gray/40 px-4 py-2 text-sm font-medium text-memopyk-navy transition hover:bg-memopyk-cream/80"
          >
            Annuler et retourner à la liste
          </button>
        </div>
      </form>
    </div>
  )
}
