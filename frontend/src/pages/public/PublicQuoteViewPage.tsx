import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button } from '../../components/ui/button'
import { Steps } from '../../components/common/Steps'
import { usePublicQuote, useAcceptQuoteOnline, usePublicPinSubmit } from '../../lib/hooks/usePublicQuote'
import { useQuotePdfJob, useRequestQuotePdf } from '../../lib/useQuotePdf'
import { formatISO, formatMoney } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'

export function PublicQuoteViewPage() {
  const { token } = useParams<{ token: string }>()
  const [pinInput, setPinInput] = useState('')
  const [name, setName] = useState('')
  const [acceptCgv, setAcceptCgv] = useState(false)
  const [localAcceptError, setLocalAcceptError] = useState<string | null>(null)

  const publicQuoteQuery = usePublicQuote(token)
  const acceptOnlineMutation = useAcceptQuoteOnline(token)
  const pinSubmitMutation = usePublicPinSubmit(token)

  const quote = publicQuoteQuery.data?.data ?? null

  const httpError = (publicQuoteQuery.error as (Error & { status?: number; code?: string; details?: any }) | null) ?? null
  const errorStatus = httpError?.status
  const errorCode = httpError?.code
  const isForbidden = errorStatus === 403
  const isNotFound = errorStatus === 404

  const isAccepted = quote?.status === 'accepted'
  const acceptanceMode = quote?.acceptanceMode ?? null
  const acceptedAt = quote?.acceptedAt ?? null
  const acceptedByName = quote?.acceptedByName ?? null

  const pageTitle = quote?.number
    ? `MEMOPYK Devis — Devis client — ${quote.number}`
    : 'MEMOPYK Devis — Devis client'

  usePageTitle(pageTitle)

  let acceptanceSummary: string | null = null
  if (isAccepted) {
    if (acceptanceMode === 'online') {
      acceptanceSummary = acceptedAt
        ? `Ce devis a été accepté en ligne le ${formatISO(acceptedAt)}.`
        : 'Ce devis a été accepté en ligne.'
    } else if (acceptanceMode === 'paper') {
      acceptanceSummary = acceptedAt
        ? `Ce devis a été accepté (papier) le ${formatISO(acceptedAt)}.`
        : 'Ce devis a déjà été accepté (papier).'
    } else {
      acceptanceSummary = 'Ce devis a déjà été accepté.'
    }
  }

  const pinLockedFromView = isForbidden && errorCode === 'pin_locked'

  const pinErrorFromSubmit = pinSubmitMutation.error as
    | (Error & { code?: string; details?: any })
    | null

  const pinErrorMessage = useMemo(() => {
    if (pinLockedFromView) {
      const unlockAt = (httpError?.details as any)?.unlock_at as string | undefined
      if (unlockAt) {
        return `Le code PIN est temporairement verrouillé. Vous pourrez réessayer après le ${formatISO(unlockAt)}.`
      }
      return 'Le code PIN est temporairement verrouillé. Merci de réessayer plus tard.'
    }

    if (!pinErrorFromSubmit) return null

    switch (pinErrorFromSubmit.code) {
      case 'pin_invalid': {
        const remaining = (pinErrorFromSubmit.details as any)?.remaining_attempts
        if (typeof remaining === 'number') {
          return `Code PIN incorrect. Il vous reste ${remaining} tentative(s) avant le verrouillage.`
        }
        return 'Code PIN incorrect. Vérifiez le code et réessayez.'
      }
      case 'pin_locked': {
        const unlockAt = (pinErrorFromSubmit.details as any)?.unlock_at as string | undefined
        if (unlockAt) {
          return `Le code PIN est temporairement verrouillé. Vous pourrez réessayer après le ${formatISO(unlockAt)}.`
        }
        return 'Le code PIN est temporairement verrouillé. Merci de réessayer plus tard.'
      }
      case 'pin_not_required':
        return 'Ce lien ne nécessite plus de code PIN. Actualisez la page pour accéder au devis.'
      case 'public_link_not_found':
        return 'Ce lien de devis est expiré ou introuvable. Merci de contacter MEMOPYK.'
      default:
        return "Une erreur est survenue lors de la vérification du code PIN. Merci de réessayer dans un instant."
    }
  }, [httpError?.details, pinErrorFromSubmit, pinLockedFromView])

  const acceptanceModeLabel =
    acceptanceMode === 'online'
      ? 'En ligne'
      : acceptanceMode === 'paper'
        ? 'Sur papier'
        : '—'

  const acceptedAtLabel = acceptedAt ? formatISO(acceptedAt) : '—'

  const currentVersion = quote?.current_version ?? null

  const versions = quote?.versions ?? null
  const otherVersions =
    versions && currentVersion ? versions.filter((version) => version.id !== currentVersion.id) : []
  const hasOtherVersions = otherVersions.length > 0

  const [pdfJobId, setPdfJobId] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const requestPdfMutation = useRequestQuotePdf(quote?.id ?? '', currentVersion?.id ?? null)
  const pdfJobQuery = useQuotePdfJob(pdfJobId)
  const pdfJob = pdfJobQuery.data ?? null
  const pdfJobStatus: 'idle' | 'pending' | 'ready' | 'failed' = pdfJob ? pdfJob.status : 'idle'
  const pdfIsGenerating =
    requestPdfMutation.isPending || (pdfJobStatus === 'pending' && pdfJobQuery.isFetching)

  const pdfUrlFromJob = pdfJob?.status === 'ready' ? pdfJob.url ?? null : null
  const pdfUrlFromVersion = currentVersion?.pdf_url ?? null
  const pdfDownloadUrl = pdfUrlFromJob ?? pdfUrlFromVersion ?? null

  const pdfGeneratedAtRaw = (pdfJob?.status === 'ready' && pdfJob.generatedAt) || currentVersion?.pdf_generated_at
  const pdfGeneratedAtLabel = pdfGeneratedAtRaw ? formatISO(pdfGeneratedAtRaw) : null

  const handlePinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pinInput.trim()) {
      return
    }

    pinSubmitMutation.mutate({ pin: pinInput.trim() })
  }

  const handleAcceptSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalAcceptError(null)

    if (!name.trim() || !acceptCgv) {
      setLocalAcceptError(
        'Merci de renseigner votre nom complet et de confirmer la lecture et l’acceptation des CGV.',
      )
      return
    }

    acceptOnlineMutation.mutate(
      {
        full_name: name.trim(),
        accept_cgv: acceptCgv,
      },
      {
        onError: (error) => {
          const err = error as Error & { code?: string; status?: number; details?: any }

          let message: string
          switch (err.code) {
            case 'cgv_not_accepted':
            case 'validation_error':
              message =
                'Merci de renseigner votre nom complet et de confirmer la lecture et l’acceptation des CGV.'
              break
            case 'already_accepted':
              message =
                'Ce devis est déjà accepté. Si vous avez une question ou souhaitez ajuster le projet, merci de contacter MEMOPYK.'
              break
            case 'pin_required':
              message =
                'Ce devis est protégé par un code PIN. Merci de saisir le code reçu pour poursuivre l’acceptation.'
              break
            case 'pin_locked': {
              message =
                'Le code PIN est temporairement verrouillé. Merci de réessayer plus tard ou de contacter MEMOPYK en cas de doute.'
              break
            }
            case 'public_link_not_found':
              message =
                'Ce lien de devis est expiré ou ne correspond à aucun projet MEMOPYK. Merci de nous contacter pour obtenir un nouveau lien.'
              break
            default:
              message =
                'Une erreur est survenue lors de votre acceptation en ligne. Merci de réessayer dans un instant.'
              break
          }

          setLocalAcceptError(message)
        },
      },
    )
  }

  const handlePdfClick = () => {
    if (!quote || !currentVersion) return

    setPdfError(null)

    if (pdfDownloadUrl) {
      window.open(pdfDownloadUrl, '_blank', 'noopener,noreferrer')
      return
    }

    if (pdfIsGenerating) return

    requestPdfMutation.mutate(undefined, {
      onSuccess: (nextJob) => {
        setPdfJobId(nextJob.jobId)
      },
      onError: () => {
        setPdfError(
          "Impossible de préparer le PDF pour le moment. Merci de réessayer dans un instant.",
        )
      },
    })
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Lien invalide</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Ce lien de devis n’est plus valide ou est incomplet. Merci de vérifier l’adresse reçue ou de
          contacter MEMOPYK.
        </p>
      </div>
    )
  }

  if (isNotFound) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Devis introuvable</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Ce lien de devis est expiré ou ne correspond à aucun projet MEMOPYK. Si vous pensez qu’il s’agit
          d’une erreur, contactez-nous pour obtenir un nouveau lien.
        </p>
      </div>
    )
  }

  if (isForbidden && !quote) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-10">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-memopyk-blue-gray">Espace client sécurisé</p>
          <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Votre devis MEMOPYK</h1>
        </header>

        <section className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
          <p className="text-sm text-memopyk-blue-gray">
            Ce devis est protégé par un code à 6 chiffres. Saisissez le code reçu par MEMOPYK pour accéder au
            détail de votre projet.
          </p>

          <form onSubmit={handlePinSubmit} className="mt-4 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-xl border border-memopyk-dark-blue/20 px-3 py-2 text-center text-lg tracking-[0.4em]"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={pinLockedFromView}
            />
            {pinErrorMessage && <p className="text-xs text-red-600">{pinErrorMessage}</p>}
            <Button
              type="submit"
              className="mt-2 w-full rounded-full"
              disabled={
                publicQuoteQuery.isLoading ||
                pinSubmitMutation.isPending ||
                pinInput.length !== 6 ||
                pinLockedFromView
              }
            >
              {pinSubmitMutation.isPending || publicQuoteQuery.isLoading
                ? 'Vérification…'
                : 'Déverrouiller le devis'}
            </Button>
          </form>
        </section>
      </div>
    )
  }

  if (publicQuoteQuery.isError && !quote) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="text-2xl font-semibold text-memopyk-dark-blue">Impossible d’afficher le devis</h1>
        <p className="text-sm text-memopyk-blue-gray">
          Une erreur est survenue lors du chargement de votre devis. Vérifiez votre connexion Internet, puis
          réessayez.
        </p>
        <Button type="button" onClick={() => publicQuoteQuery.refetch()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-memopyk-blue-gray">Espace client sécurisé</p>
        <h1 className="text-3xl font-semibold text-memopyk-dark-blue">Votre devis MEMOPYK</h1>
        {quote && (
          <p className="text-sm text-memopyk-blue-gray">
            Référence : <span className="font-medium text-memopyk-dark-blue">{quote.number}</span>
          </p>
        )}
      </header>

      {publicQuoteQuery.isLoading && !quote && (
        <div className="flex justify-center py-10">
          <div className="animate-pulse text-sm text-memopyk-blue-gray">Chargement de votre devis…</div>
        </div>
      )}

      {quote && (
        <div className="space-y-6">
          {isAccepted && (
            <section className="rounded-3xl border border-emerald-500/25 bg-emerald-50/80 p-4 text-sm text-emerald-900">
              <h2 className="text-sm font-semibold text-emerald-900">Reçu d’acceptation</h2>
              {acceptanceSummary && <p className="mt-1">{acceptanceSummary}</p>}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-900/80">Mode d’acceptation</p>
                  <p className="mt-1 font-medium">{acceptanceModeLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-900/80">Accepté le</p>
                  <p className="mt-1 font-medium">{acceptedAtLabel}</p>
                </div>
                {acceptedByName && (
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-emerald-900/80">Au nom de</p>
                    <p className="mt-1 font-medium">{acceptedByName}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-memopyk-dark-blue">Résumé du projet</h2>
            <div className="mt-3 grid gap-3 text-sm text-memopyk-blue-gray md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray/80">Client</p>
                <p className="mt-1 text-memopyk-dark-blue">{quote.customer_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray/80">Créé le</p>
                <p className="mt-1 text-memopyk-dark-blue">{formatISO(quote.created_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray/80">Valide jusqu’au</p>
                <p className="mt-1 text-memopyk-dark-blue">
                  {formatISO(quote.validity_date ?? null) || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray/80">Devise</p>
                <p className="mt-1 text-memopyk-dark-blue">{quote.currency_code}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-memopyk-dark-blue">Détail du devis</h2>
              <p className="text-sm text-memopyk-blue-gray">
                Retrouvez ci-dessous les prestations prévues et le montant total TTC.
              </p>
            </div>

            {!currentVersion ? (
              <p className="text-sm text-memopyk-blue-gray">
                Les détails de ce devis ne sont pas encore disponibles. Merci de contacter MEMOPYK si besoin.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-memopyk-dark-blue/10">
                  <table className="min-w-full divide-y divide-memopyk-dark-blue/10 text-sm">
                    <thead className="bg-memopyk-cream/70">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          Qté
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          Unitaire
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          TVA %
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                          Total TTC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-memopyk-dark-blue/10">
                      {currentVersion.lines.map((line) => (
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-memopyk-cream/60 px-4 py-3 text-sm">
                  <span className="font-medium text-memopyk-dark-blue">Total TTC</span>
                  <span className="text-base font-semibold text-memopyk-dark-blue">
                    {formatMoney(currentVersion.totals_gross_cents, quote.currency_code)}
                  </span>
                </div>
              </>
            )}
          </section>

          {hasOtherVersions && (
            <section className="space-y-4 rounded-3xl border border-dashed border-memopyk-dark-blue/20 bg-memopyk-cream/70 p-6 text-sm text-memopyk-blue-gray">
              <div>
                <h2 className="text-lg font-semibold text-memopyk-dark-blue">Voir les autres options</h2>
                <p className="mt-2">
                  MEMOPYK peut proposer plusieurs versions de votre projet. La version affichée ci-dessus est la
                  plus récente sélectionnée, et les autres sont indiquées ci-dessous pour référence.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {otherVersions.map((version) => {
                  const isCurrent = version.status === 'current'
                  const isLocked = version.is_locked

                  let statusLabel: string
                  if (isCurrent) {
                    statusLabel = 'Version actuelle'
                  } else if (isLocked) {
                    statusLabel = 'Non retenue (verrouillée)'
                  } else {
                    statusLabel = 'Option en cours de préparation'
                  }

                  const createdAtLabel = version.created_at ? formatISO(version.created_at) : null

                  return (
                    <div
                      key={version.id}
                      className="rounded-2xl border border-memopyk-dark-blue/15 bg-white p-5 shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">
                        Option V{version.version_number}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-memopyk-dark-blue">
                        {version.label || 'Variante de devis'}
                      </h3>
                      {createdAtLabel && (
                        <p className="mt-1 text-xs text-memopyk-blue-gray">Créée le {createdAtLabel}</p>
                      )}
                      <p className="mt-3 inline-flex items-center rounded-full bg-memopyk-cream px-3 py-1 text-xs font-medium text-memopyk-dark-blue">
                        {statusLabel}
                      </p>
                      <p className="mt-2 text-xs text-memopyk-blue-gray">
                        Cette version reste visible pour comparaison mais n’est pas celle actuellement mise en
                        avant.
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {currentVersion && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-memopyk-dark-blue/15 bg-white p-4 text-sm shadow-sm">
              <div>
                <h2 className="text-sm font-semibold text-memopyk-dark-blue">Télécharger le devis en PDF</h2>
                <p className="text-xs text-memopyk-blue-gray">
                  Obtenez une copie PDF de ce devis pour l’imprimer ou le conserver.
                </p>
                {pdfGeneratedAtLabel && (
                  <p className="mt-1 text-xs text-memopyk-blue-gray">
                    Dernière génération le {pdfGeneratedAtLabel}
                  </p>
                )}
                {pdfError && <p className="mt-1 text-xs text-red-600">{pdfError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="rounded-full"
                  variant={pdfDownloadUrl ? 'accent' : 'outline'}
                  disabled={pdfIsGenerating}
                  onClick={handlePdfClick}
                >
                  {pdfIsGenerating
                    ? 'Préparation du PDF…'
                    : pdfDownloadUrl
                      ? 'Télécharger le PDF'
                      : 'Préparer le PDF'}
                </Button>
              </div>
            </section>
          )}

          <section className="space-y-4 rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-memopyk-dark-blue">
                Validation en ligne et Conditions Générales
              </h2>
              <p className="mt-1 text-sm text-memopyk-blue-gray">
                En validant ce devis en ligne, vous confirmez avoir lu et accepté les Conditions Générales de
                Vente MEMOPYK liées à ce projet. La validation porte sur la version actuellement active de votre
                devis, telle qu’elle a été sélectionnée par MEMOPYK.
              </p>
            </div>

            {isAccepted ? (
              <p className="text-sm text-memopyk-blue-gray">
                Ce devis est déjà accepté. Si vous avez une question ou souhaitez ajuster le projet, merci de
                contacter MEMOPYK.
              </p>
            ) : (
              <form onSubmit={handleAcceptSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-memopyk-dark-blue" htmlFor="client-name">
                    Nom et prénom
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    className="w-full rounded-xl border border-memopyk-dark-blue/20 px-3 py-2 text-sm"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex. Marie Dupont"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <input
                    id="accept-cgv"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-memopyk-dark-blue/40"
                    checked={acceptCgv}
                    onChange={(event) => setAcceptCgv(event.target.checked)}
                  />
                  <label htmlFor="accept-cgv" className="text-xs text-memopyk-blue-gray">
                    Je confirme avoir lu et accepté les Conditions Générales de Vente MEMOPYK et je souhaite
                    valider ce devis en ligne.
                  </label>
                </div>

                {localAcceptError && <p className="text-xs text-red-600">{localAcceptError}</p>}
                {acceptOnlineMutation.isError && !localAcceptError && (
                  <p className="text-xs text-red-600">
                    Une erreur technique est survenue. Merci de réessayer dans un instant.
                  </p>
                )}

                <Button
                  type="submit"
                  className="mt-2 rounded-full"
                  disabled={acceptOnlineMutation.isPending}
                >
                  {acceptOnlineMutation.isPending ? 'Validation en cours…' : 'Accepter le devis en ligne'}
                </Button>
              </form>
            )}

            <div className="mt-4 rounded-2xl bg-memopyk-cream/60 p-4 text-xs text-memopyk-blue-gray">
              <p className="font-medium text-memopyk-dark-blue">Bloc CGV / mentions légales</p>
              <p className="mt-1">
                Ce résumé ne remplace pas les Conditions Générales de Vente complètes. La version détaillée vous
                est communiquée avec le devis et reste disponible sur demande.
              </p>
            </div>
          </section>

          <Steps
            title="Prochaines étapes"
            steps={[
              {
                label: 'Échanger avec MEMOPYK sur les derniers détails pratiques (planning, lieu, options).',
                sub: 'Quelques minutes par e-mail ou téléphone',
              },
              {
                label: 'Préparer vos photos et vidéos pour le projet.',
                sub: 'Nous vous guiderons sur le format et le mode d’envoi.',
              },
              {
                label: 'Organisation de la collecte et du montage par l’équipe MEMOPYK.',
                sub: 'Vous recevrez un récapitulatif et les prochaines dates clés.',
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
