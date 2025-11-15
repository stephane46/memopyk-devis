import { Link, useSearchParams } from 'react-router-dom'
import { useQuotesList } from '../../../lib/hooks/useQuotes'
import { formatISO, formatMoney } from '../../../lib/format'

const PAGE_SIZE = 20

export default function QuotesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))

  const { data, isLoading, isError, refetch } = useQuotesList({
    q: q || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const quotes = data?.data ?? []
  const hasFilters = Boolean(q || status)
  const hasQuotes = quotes.length > 0

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    if (key !== 'page') {
      next.delete('page')
    }
    setSearchParams(next, { replace: true })
  }

  function goToPage(nextPage: number) {
    updateParam('page', String(Math.max(1, nextPage)))
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Devis</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Visualisez les devis existants et filtrez par statut ou par client.
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <input
          className="w-full max-w-sm rounded-full border border-memopyk-dark-blue/20 px-4 py-2 text-sm shadow-sm focus:border-memopyk-dark-blue focus:outline-none"
          placeholder="Recherche (numéro ou client)…"
          value={q}
          disabled={!isLoading && !hasQuotes && !hasFilters}
          onChange={(event) => updateParam('q', event.target.value)}
        />
        <select
          className="w-full max-w-xs rounded-full border border-memopyk-dark-blue/20 px-4 py-2 text-sm shadow-sm focus:border-memopyk-dark-blue focus:outline-none"
          value={status}
          onChange={(event) => updateParam('status', event.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoyé</option>
          <option value="accepted">Accepté</option>
          <option value="rejected">Refusé</option>
          <option value="archived">Archivé</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-memopyk-blue-gray">Chargement…</div>
        </div>
      )}

      {isError && (
        (() => {
          const isOffline =
            typeof navigator !== 'undefined' ? navigator.onLine === false : false

          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <h1 className="mb-2 text-center text-2xl font-semibold text-memopyk-navy">
                Impossible de charger les devis
              </h1>

              {isOffline ? (
                <p className="mb-4 max-w-xl text-center text-memopyk-blue-gray">
                  Vous semblez être hors ligne. Veuillez vérifier votre connexion Internet et réessayer.
                </p>
              ) : (
                <p className="mb-4 max-w-xl text-center text-memopyk-blue-gray">
                  Une erreur est survenue lors du chargement des devis. Veuillez réessayer dans un instant.
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
        })()
      )}

      {!isLoading && !isError && (
        (() => {
          if (!hasQuotes) {
            if (hasFilters) {
              return (
                <div className="rounded-2xl border border-memopyk-dark-blue/10 bg-white px-4 py-6 text-center text-sm text-memopyk-blue-gray">
                  Aucun devis trouvé pour ces filtres.
                </div>
              )
            }

            return (
              <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-2xl border border-memopyk-blue-gray/20 bg-memopyk-cream py-16 px-4">
                <h1 className="mb-2 text-center text-2xl font-semibold text-memopyk-navy">
                  Aucun devis pour le moment
                </h1>
                <p className="mb-6 max-w-xl text-center text-memopyk-blue-gray">
                  Crée ton premier devis MEMOPYK pour un client. Tu pourras ensuite le dupliquer, gérer
                  plusieurs versions et l’envoyer directement par lien sécurisé.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-memopyk-orange px-4 py-2 font-medium text-white shadow-sm transition hover:opacity-90"
                    onClick={() => {
                      // TODO: replace with real navigation to quote creation
                    }}
                  >
                    Créer un premier devis
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div className="overflow-x-auto rounded-3xl border border-memopyk-dark-blue/10 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-memopyk-dark-blue/10 text-sm">
                <thead className="bg-memopyk-cream/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Numéro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Créé le</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-memopyk-dark-blue/10">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="transition hover:bg-memopyk-cream/40">
                      <td className="px-4 py-3 font-medium text-memopyk-dark-blue">
                        <Link className="underline" to={`/admin/quotes/${quote.id}`}>
                          {quote.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-memopyk-dark-blue">
                        {quote.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 capitalize text-memopyk-blue-gray">{quote.status}</td>
                      <td className="px-4 py-3 text-memopyk-blue-gray">{formatISO(quote.created_at)}</td>
                      <td className="px-4 py-3 text-right font-medium text-memopyk-dark-blue">
                        {formatMoney(quote.totals_gross_cents, quote.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full border border-memopyk-dark-blue/20 px-4 py-2 text-sm text-memopyk-dark-blue transition hover:bg-memopyk-dark-blue hover:text-memopyk-cream disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
        >
          Précédent
        </button>
        <span className="text-sm text-memopyk-blue-gray">Page {page}</span>
        <button
          type="button"
          className="rounded-full border border-memopyk-dark-blue/20 px-4 py-2 text-sm text-memopyk-dark-blue transition hover:bg-memopyk-dark-blue hover:text-memopyk-cream disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => goToPage(page + 1)}
          disabled={!hasQuotes}
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
