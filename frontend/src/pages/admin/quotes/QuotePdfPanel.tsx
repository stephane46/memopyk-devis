import { useState } from 'react'

import { useRequestQuotePdf, useQuotePdfJob } from '../../../lib/useQuotePdf'

type QuotePdfPanelProps = {
  quoteId: string
  versionId: string | null
}

export function QuotePdfPanel({ quoteId, versionId }: QuotePdfPanelProps) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const requestMutation = useRequestQuotePdf(quoteId, versionId)
  const jobQuery = useQuotePdfJob(currentJobId)

  const job = jobQuery.data ?? null

  const status: 'idle' | 'pending' | 'ready' | 'failed' = job
    ? job.status
    : 'idle'

  const isGenerating =
    requestMutation.isPending || (status === 'pending' && jobQuery.isFetching)

  const remoteErrorMessage = jobQuery.isError
    ? jobQuery.error?.message ?? "Une erreur est survenue lors du suivi du PDF."
    : null

  const mutationErrorMessage = requestMutation.isError
    ? requestMutation.error?.message ?? "Impossible de lancer la génération du PDF."
    : null

  const bannerMessage = localError || mutationErrorMessage || remoteErrorMessage

  const handleGenerateClick = () => {
    if (!versionId || isGenerating) return

    setLocalError(null)
    requestMutation.mutate(undefined, {
      onSuccess: (nextJob) => {
        setCurrentJobId(nextJob.jobId)
      },
      onError: () => {
        setLocalError(
          "Impossible de lancer la génération du PDF pour le moment. Merci de réessayer.",
        )
      },
    })
  }

  const handleRetryClick = () => {
    if (currentJobId) {
      jobQuery.refetch()
    } else {
      handleGenerateClick()
    }
  }

  const renderStatusText = () => {
    if (!versionId) {
      return "Aucune version active — générez un PDF une fois une version disponible."
    }

    switch (status) {
      case 'pending':
        return "Génération du PDF en cours…"
      case 'ready':
        return "PDF prêt pour ce devis."
      case 'failed':
        return "Échec de la génération du PDF. Vous pouvez réessayer."
      default:
        return "Aucun PDF généré pour ce devis."
    }
  }

  const downloadUrl = job?.status === 'ready' ? job.url ?? null : null

  return (
    <section className="space-y-3 rounded-2xl border border-memopyk-dark-blue/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-memopyk-dark-blue">PDF du devis</h3>
          <p className="text-xs text-memopyk-blue-gray">Générez et téléchargez le PDF de la version active.</p>
        </div>
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!versionId || isGenerating}
          className="inline-flex items-center rounded-full bg-memopyk-orange px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'pending' || isGenerating ? 'Génération…' : 'Générer le PDF'}
        </button>
      </div>

      {bannerMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="flex items-center justify-between gap-2">
            <span>{bannerMessage}</span>
            <button
              type="button"
              onClick={handleRetryClick}
              className="text-[11px] font-medium underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p className="text-memopyk-blue-gray">{renderStatusText()}</p>

        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-memopyk-dark-blue/20 px-3 py-1.5 text-[11px] font-medium text-memopyk-dark-blue transition hover:bg-memopyk-cream/80"
          >
            Télécharger le PDF
          </a>
        )}
      </div>
    </section>
  )
}
