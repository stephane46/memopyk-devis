import { useState } from 'react'

import { formatISO } from '../../../lib/format'
import {
  useCreateQuoteVersion,
  usePublishQuoteVersion,
  useQuoteVersions,
} from '../../../lib/hooks/useQuotes'

type QuoteVersionsBarProps = {
  quoteId: string
  currentVersionId: string | null
}

export function QuoteVersionsBar({ quoteId, currentVersionId }: QuoteVersionsBarProps) {
  const [localError, setLocalError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuoteVersions(quoteId)
  const createMutation = useCreateQuoteVersion(quoteId)
  const publishMutation = usePublishQuoteVersion(quoteId)

  const versions = data?.data ?? []

  const busy = createMutation.isPending || publishMutation.isPending
  const remoteErrorMessage = isError ? error?.message ?? "Une erreur est survenue lors du chargement des versions." : null
  const mutationErrorMessage =
    (createMutation.isError && createMutation.error?.message) ||
    (publishMutation.isError && publishMutation.error?.message) ||
    null

  const bannerMessage = localError || mutationErrorMessage || remoteErrorMessage

  const handleSwitchVersion = (versionId: string) => {
    if (versionId === currentVersionId) return
    setLocalError(null)
    publishMutation.mutate(versionId, {
      onError: () => {
        setLocalError("Impossible de changer de version pour le moment. Merci de réessayer.")
      },
    })
  }

  const handleCreateVersion = () => {
    setLocalError(null)
    const payload = currentVersionId ? { from_version_id: currentVersionId } : undefined
    createMutation.mutate(payload, {
      onError: () => {
        setLocalError("Impossible de créer une nouvelle version pour le moment. Merci de réessayer.")
      },
    })
  }

  return (
    <section className="space-y-2 rounded-2xl border border-memopyk-dark-blue/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-memopyk-dark-blue">Versions du devis</h2>
          <p className="text-xs text-memopyk-blue-gray">
            Sélectionnez la version à afficher ou créez une nouvelle variante.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateVersion}
          disabled={busy}
          className="inline-flex items-center rounded-full bg-memopyk-orange px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Nouvelle version
        </button>
      </div>

      {bannerMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {bannerMessage}
        </div>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        {isLoading && (
          <div className="text-xs text-memopyk-blue-gray">Chargement des versions…</div>
        )}

        {!isLoading && versions.length === 0 && (
          <div className="text-xs text-memopyk-blue-gray">Aucune autre version pour le moment.</div>
        )}

        {versions.map((version) => {
          const isActive = version.id === currentVersionId || version.status === 'current'
          const isLocked = version.is_locked

          const baseClasses =
            'inline-flex items-stretch gap-3 rounded-full border px-3 py-1.5 text-[11px] sm:text-xs transition focus:outline-none focus:ring-2 focus:ring-memopyk-orange/70 focus:ring-offset-1'
          const activeClasses =
            'border-memopyk-orange bg-memopyk-orange text-white shadow-sm cursor-default'
          const inactiveClasses =
            'border-memopyk-dark-blue/15 bg-memopyk-cream/60 text-memopyk-dark-blue hover:bg-memopyk-cream/90'

          const statusLabel =
            version.status === 'current'
              ? 'Actif'
              : version.status === 'archived'
              ? 'Archivé'
              : 'Brouillon'

          return (
            <button
              key={version.id}
              type="button"
              disabled={busy || isActive}
              onClick={() => handleSwitchVersion(version.id)}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${
                busy || isActive ? 'opacity-80' : ''
              }`}
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold">V{version.version_number}</span>
                {version.label && (
                  <span className="max-w-[140px] truncate text-[10px] text-memopyk-blue-gray/90">
                    {version.label}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                {version.created_at && (
                  <span className="hidden text-[10px] text-memopyk-blue-gray sm:inline">
                    Créé le {formatISO(version.created_at)}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/60 text-memopyk-dark-blue'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  {isLocked && !isActive && (
                    <span className="rounded-full bg-memopyk-dark-blue/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-memopyk-dark-blue">
                      Verrouillé
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
