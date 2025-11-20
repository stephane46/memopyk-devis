import { Link, useParams } from 'react-router-dom'
import { useQuote } from '../../../lib/hooks/useQuotes'
import { formatISO, formatMoney } from '../../../lib/format'
import { usePageTitle } from '../../../lib/usePageTitle'

export default function QuoteDetailPage() {
  const { quoteId = '' } = useParams()
  const { data, isLoading, isError, error, refetch } = useQuote(quoteId)

  const quote = data?.data

  const pageTitle = quote?.number
    ? `MEMOPYK Devis — Admin — ${quote.number}`
    : 'MEMOPYK Devis — Admin — Détail du devis'

  usePageTitle(pageTitle)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-memopyk-blue-gray">Chargement…</div>
      </div>
    )
  }

  if (isError) {
    const status = (error as { status?: number } | undefined)?.status
    if (status === 404) {
      return (
        <div className="space-y-4 p-6">
          <div className="text-2xl font-semibold text-memopyk-dark-blue">Devis introuvable</div>
          <p className="text-sm text-memopyk-blue-gray">
            Le devis demandé n’existe pas ou a été supprimé.
          </p>
          <Link className="text-sm font-medium text-memopyk-dark-blue underline" to="/admin/quotes">
            Retour à la liste
          </Link>
        </div>
      )
    }

    const isOffline =
      typeof navigator !== 'undefined' ? navigator.onLine === false : false

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <h1 className="mb-2 text-center text-2xl font-semibold text-memopyk-navy">
          Impossible d'afficher ce devis
        </h1>

        {isOffline ? (
          <p className="mb-4 max-w-xl text-center text-memopyk-blue-gray">
            Vous semblez être hors ligne. Veuillez vous reconnecter pour continuer.
          </p>
        ) : (
          <p className="mb-4 max-w-xl text-center text-memopyk-blue-gray">
            Une erreur est survenue lors du chargement de ce devis. Le lien ou l'ID peut être invalide, ou le serveur peut être inaccessible.
          </p>
        )}

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center rounded-full bg-memopyk-orange px-4 py-2 font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="p-6 text-sm text-memopyk-blue-gray">
        Aucune donnée à afficher.
        <div>
          <Link className="text-memopyk-dark-blue underline" to="/admin/quotes">
            Retour à la liste
          </Link>
        </div>
      </div>
    )
  }

  let statusLabel: string
  switch (quote.status) {
    case 'draft':
      statusLabel = 'Brouillon'
      break
    case 'sent':
      statusLabel = 'Envoyé'
      break
    case 'accepted':
      statusLabel = 'Accepté'
      break
    case 'rejected':
      statusLabel = 'Refusé'
      break
    case 'archived':
      statusLabel = 'Archivé'
      break
    default:
      statusLabel = quote.status
  }

  const acceptanceMode = quote.acceptanceMode ?? null
  const acceptedAt = quote.acceptedAt ?? null

  let acceptanceBadgeLabel: string | null = null
  if (quote.status !== 'accepted' && !acceptanceMode) {
    acceptanceBadgeLabel = 'En attente'
  } else if (quote.status === 'accepted' && acceptanceMode === 'online') {
    acceptanceBadgeLabel = 'Accepté en ligne'
  } else if (quote.status === 'accepted' && acceptanceMode === 'paper') {
    acceptanceBadgeLabel = 'Accepté (papier)'
  }

  const acceptanceModeLabel =
    acceptanceMode === 'online'
      ? 'En ligne'
      : acceptanceMode === 'paper'
        ? 'Sur papier'
        : '—'

  const acceptedAtLabel = acceptedAt ? formatISO(acceptedAt) : '—'

  const version = quote.current_version ?? null

  const lastPdfGeneratedAt = version?.pdf_generated_at ?? null
  const lastPdfGeneratedLabel = lastPdfGeneratedAt ? formatISO(lastPdfGeneratedAt) : '—'

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-memopyk-dark-blue">{quote.number}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-memopyk-blue-gray">Statut : {statusLabel}</p>
            {acceptanceBadgeLabel && (
              <span className="inline-flex items-center rounded-full bg-memopyk-cream px-2.5 py-0.5 text-xs font-medium text-memopyk-dark-blue">
                {acceptanceBadgeLabel}
              </span>
            )}
          </div>
        </div>
        <Link className="text-sm font-medium text-memopyk-dark-blue underline" to="/admin/quotes">
          Retour à la liste
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Info label="Client" value={quote.customer_name ?? '—'} />
        <Info label="Créé le" value={formatISO(quote.created_at)} />
        <Info label="Valide jusqu’au" value={formatISO(quote.validity_date ?? null)} />
        <Info label="Devise" value={quote.currency_code} />
        <Info label="Dernière génération PDF" value={lastPdfGeneratedLabel} />
        <Info label="Mode d’acceptation" value={acceptanceModeLabel} />
        <Info label="Accepté le" value={acceptedAtLabel} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-memopyk-dark-blue">Version courante</h2>
          <p className="text-sm text-memopyk-blue-gray">
            Visualisez les lignes et montants du devis actif.
          </p>
        </div>
        {!version ? (
          <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-white px-4 py-6 text-sm text-memopyk-blue-gray">
            Aucune version active.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-5">
              <Stat label="Net" value={formatMoney(version.totals_net_cents, quote.currency_code)} />
              <Stat label="TVA" value={formatMoney(version.totals_tax_cents, quote.currency_code)} />
              <Stat label="Total TTC" value={formatMoney(version.totals_gross_cents, quote.currency_code)} />
              <Stat label="Acompte" value={formatMoney(version.totals_deposit_cents, quote.currency_code)} />
              <Stat label="Solde" value={formatMoney(version.totals_balance_cents, quote.currency_code)} />
            </div>

            <div className="overflow-x-auto rounded-3xl border border-memopyk-dark-blue/10 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-memopyk-dark-blue/10 text-sm">
                <thead className="bg-memopyk-cream/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Qté</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Unitaire</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">TVA %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-memopyk-dark-blue/10">
                  {version.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-memopyk-dark-blue">{line.position}</td>
                      <td className="px-4 py-3 text-memopyk-dark-blue">{line.description}</td>
                      <td className="px-4 py-3 text-right text-memopyk-blue-gray">{line.quantity}</td>
                      <td className="px-4 py-3 text-right text-memopyk-dark-blue">
                        {formatMoney(line.unit_cents, quote.currency_code)}
                      </td>
                      <td className="px-4 py-3 text-right text-memopyk-blue-gray">{line.tax_rate_pct}%</td>
                      <td className="px-4 py-3 text-right text-memopyk-dark-blue">
                        {formatMoney(line.totals_gross_cents, quote.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-memopyk-blue-gray">{label}</div>
      <div className="mt-1 text-sm text-memopyk-dark-blue">{value}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-memopyk-blue-gray">{label}</div>
      <div className="mt-1 text-base font-semibold text-memopyk-dark-blue">{value}</div>
    </div>
  )
}
