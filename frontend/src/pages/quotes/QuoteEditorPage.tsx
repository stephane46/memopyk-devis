import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ComingSoon } from '../../components/ComingSoon'
import { QuoteLinesPanel } from '../admin/quotes/QuoteLinesPanel'
import { QuoteVersionsBar } from '../admin/quotes/QuoteVersionsBar'
import { QuotePdfPanel } from '../admin/quotes/QuotePdfPanel'
import { useQuote, useUpdateQuote } from '../../lib/hooks/useQuotes'
import type { UpdateQuotePayload } from '../../lib/api'
import { formatISO, formatMoney } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'

export function QuoteEditorPage() {
	const { id = '' } = useParams()
	const { data, isLoading, isError, error, refetch } = useQuote(id)
	const updateMutation = useUpdateQuote(id)

	const [customerNameInput, setCustomerNameInput] = useState('')
	const [titleInput, setTitleInput] = useState('')
	const [notesInput, setNotesInput] = useState('')
	const [validityDateInput, setValidityDateInput] = useState('')
	const [localError, setLocalError] = useState<string | null>(null)

	const quote = data?.data

	useEffect(() => {
		if (!quote) return
		setCustomerNameInput(quote.customer_name ?? '')
		setTitleInput(quote.title ?? '')
		setNotesInput(quote.summary ?? '')
		const rawValidity = quote.validity_date ?? null
		setValidityDateInput(rawValidity ? rawValidity.slice(0, 10) : '')
		setLocalError(null)
		if (updateMutation.isError) {
			updateMutation.reset()
		}
	}, [quote, updateMutation])

	const pageTitle = quote?.number
		? `MEMOPYK Devis — Éditeur — ${quote.number}`
		: 'MEMOPYK Devis — Éditeur de devis'

	usePageTitle(pageTitle)

	if (isLoading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<div className="animate-pulse text-memopyk-blue-gray">Chargement de l’éditeur de devis…</div>
			</div>
		)
	}

	if (isError) {
		const status = (error as { status?: number } | undefined)?.status
		const isOffline = typeof navigator !== 'undefined' ? navigator.onLine === false : false

		if (status === 404) {
			return (
				<div className="space-y-4">
					<h1 className="text-2xl font-semibold text-memopyk-dark-blue">Devis introuvable</h1>
					<p className="text-sm text-memopyk-blue-gray">
						Le devis demandé n’existe pas ou a été supprimé.
					</p>
					<div className="flex flex-wrap gap-3">
						<Button variant="accent" onClick={() => refetch()}>
							Réessayer
						</Button>
						<Button variant="outline" asChild>
							<Link to="/admin/quotes">Retour à la liste des devis</Link>
						</Button>
					</div>
				</div>
			)
		}

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold text-memopyk-dark-blue">
					Impossible d’ouvrir l’éditeur de devis
				</h1>
				<p className="text-sm text-memopyk-blue-gray">
					{isOffline
						? 'Vous semblez être hors ligne. Veuillez vous reconnecter pour continuer.'
						: "Une erreur est survenue lors du chargement de ce devis. Le lien ou l’ID peut être invalide, ou le serveur peut être inaccessible."}
				</p>
				<div className="flex flex-wrap gap-3">
					<Button variant="accent" onClick={() => refetch()}>
						Réessayer
					</Button>
					<Button variant="outline" asChild>
						<Link to="/admin/quotes">Retour à la liste des devis</Link>
					</Button>
				</div>
			</div>
		)
	}

	if (!quote) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold text-memopyk-dark-blue">Aucune donnée de devis</h1>
				<p className="text-sm text-memopyk-blue-gray">
					Aucune donnée n’a été renvoyée pour cet identifiant de devis.
				</p>
				<Button variant="outline" asChild>
					<Link to="/admin/quotes">Retour à la liste des devis</Link>
				</Button>
			</div>
		)
	}

	const acceptanceMode = quote.acceptanceMode ?? null
	const acceptedAt = quote.acceptedAt ?? null
	const acceptedByName = quote.acceptedByName ?? null

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

	const acceptanceModeLabel =
		acceptanceMode === 'online'
			? 'En ligne'
			: acceptanceMode === 'paper'
				? 'Sur papier'
				: '—'

	const acceptedAtLabel = acceptedAt ? formatISO(acceptedAt) : '—'
	const version = quote.current_version ?? null

	const initialCustomerName = quote.customer_name ?? ''
	const initialTitle = quote.title ?? ''
	const initialNotes = quote.summary ?? ''
	const initialValidityDate = quote.validity_date ? quote.validity_date.slice(0, 10) : ''

	const isReadOnlyMetadata = quote.status === 'accepted' || quote.status === 'archived'
	const hasChanges =
		customerNameInput !== initialCustomerName ||
		titleInput !== initialTitle ||
		notesInput !== (initialNotes ?? '') ||
		validityDateInput !== initialValidityDate

	const versionTitle = version
		? `Version V${version.version_number}${version.label ? ` — ${version.label}` : ''}`
		: 'Aucune version active pour l’instant.'

	const versionTotalLabel = version
		? formatMoney(version.totals_gross_cents, quote.currency_code)
		: null

	const versionLinesCount = version?.lines.length ?? 0

	const canEditLines = !!version && !isReadOnlyMetadata

	const remoteErrorMessage =
		updateMutation.isError
			? updateMutation.error?.message ??
			  "Une erreur est survenue lors de l’enregistrement du devis. Merci de réessayer."
			: null

	const metadataError = localError || remoteErrorMessage

	const handleSaveMetadata = () => {
		if (isReadOnlyMetadata || updateMutation.isPending) return

		const trimmedTitle = titleInput.trim()
		const trimmedCustomer = customerNameInput.trim()
		const nextNotes = notesInput
		const trimmedValidityDate = validityDateInput.trim()

		if (!trimmedTitle || !trimmedCustomer) {
			setLocalError('Le titre du devis et le nom du client sont obligatoires.')
			return
		}

		if (trimmedValidityDate.length > 0) {
			const createdAtDateOnly = quote.created_at.slice(0, 10)
			const validityDate = new Date(`${trimmedValidityDate}T00:00:00.000Z`)
			const createdAtDate = new Date(`${createdAtDateOnly}T00:00:00.000Z`)

			if (
				!Number.isNaN(validityDate.getTime()) &&
				!Number.isNaN(createdAtDate.getTime()) &&
				validityDate < createdAtDate
			) {
				setLocalError(
					'La date de validité ne peut pas être antérieure à la date de création du devis.',
				)
				return
			}
		}

		const payload: UpdateQuotePayload = {}

		if (trimmedTitle !== initialTitle) {
			payload.title = trimmedTitle
		}

		if (trimmedCustomer !== initialCustomerName) {
			payload.customer_name = trimmedCustomer
		}

		if (nextNotes !== (initialNotes ?? '')) {
			payload.notes = nextNotes.trim()
		}

		if (validityDateInput !== initialValidityDate) {
			const trimmedDate = validityDateInput.trim()
			payload.valid_until = trimmedDate.length === 0 ? null : trimmedDate
		}

		if (Object.keys(payload).length === 0) {
			setLocalError('Aucune modification à enregistrer pour le moment.')
			return
		}

		setLocalError(null)
		updateMutation.mutate(payload)
	}

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-wide text-memopyk-blue-gray">Éditeur de devis</p>
					<h1 className="text-3xl font-semibold text-memopyk-dark-blue">{quote.number}</h1>
					<p className="text-sm text-memopyk-blue-gray">
						{quote.title || 'Sans titre'} ·{' '}
						<span className="font-medium text-memopyk-dark-blue">
							{quote.customer_name ?? 'Client non renseigné'}
						</span>
					</p>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-memopyk-blue-gray">
						<span>
							Statut :{' '}
							<span className="font-semibold text-memopyk-dark-blue">{statusLabel}</span>
						</span>
						<span className="hidden h-[3px] w-[3px] rounded-full bg-memopyk-blue-gray/60 sm:inline-block" />
						<span>
							Mode d’acceptation :{' '}
							<span className="font-medium text-memopyk-dark-blue">{acceptanceModeLabel}</span>
						</span>
						<span className="hidden h-[3px] w-[3px] rounded-full bg-memopyk-blue-gray/60 sm:inline-block" />
						<span>
							Accepté le :{' '}
							<span className="font-medium text-memopyk-dark-blue">{acceptedAtLabel}</span>
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Button variant="outline" asChild>
						<Link to={`/admin/quotes/${quote.id}`}>Voir la fiche admin</Link>
					</Button>
					<Button variant="outline" disabled>
						Voir la version PDF
					</Button>
					<Button
						variant="accent"
						type="button"
						disabled={isReadOnlyMetadata || !hasChanges || updateMutation.isPending}
						onClick={handleSaveMetadata}
					>
						{updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
					</Button>
					{!updateMutation.isPending && !metadataError && (
						<p className="text-xs text-memopyk-blue-gray">
							{hasChanges ? (
								<span className="inline-flex items-center rounded-full bg-memopyk-orange/10 px-2 py-0.5 font-medium text-memopyk-orange">
									Modifications non enregistrées
								</span>
							) : (
								<span>Toutes les modifications sont enregistrées.</span>
							)}
						</p>
					)}
				</div>
			</header>

			<div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
				<aside className="space-y-4">
					<div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-memopyk-dark-blue">Informations principales</h2>
						{metadataError && (
							<div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">
								{metadataError}
							</div>
						)}
						<div className="mt-4 space-y-4 text-sm">
							<div>
								<label
									className="mb-1 block text-sm font-medium text-memopyk-navy"
									htmlFor="quote-editor-customer"
								>
									Nom du client
								</label>
								<input
									id="quote-editor-customer"
									type="text"
									className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
									value={customerNameInput}
									onChange={(event) => {
										if (localError) setLocalError(null)
										if (updateMutation.isError) updateMutation.reset()
										setCustomerNameInput(event.target.value)
									}}
									disabled={isReadOnlyMetadata || updateMutation.isPending}
								/>
							</div>
							<div>
								<label
									className="mb-1 block text-sm font-medium text-memopyk-navy"
									htmlFor="quote-editor-title"
								>
									Titre du devis
								</label>
								<input
									id="quote-editor-title"
									type="text"
									className="w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
									value={titleInput}
									onChange={(event) => {
										if (localError) setLocalError(null)
										if (updateMutation.isError) updateMutation.reset()
										setTitleInput(event.target.value)
									}}
									disabled={isReadOnlyMetadata || updateMutation.isPending}
								/>
							</div>
							<div>
								<label
									className="mb-1 block text-sm font-medium text-memopyk-navy"
									htmlFor="quote-editor-notes"
								>
									Notes internes (non visibles par le client)
								</label>
								<textarea
									id="quote-editor-notes"
									className="min-h-[80px] w-full rounded-xl border border-memopyk-blue-gray/40 px-3 py-2 text-sm"
									value={notesInput}
									onChange={(event) => {
										if (localError) setLocalError(null)
										if (updateMutation.isError) updateMutation.reset()
										setNotesInput(event.target.value)
									}}
									disabled={isReadOnlyMetadata || updateMutation.isPending}
								/>
								<p className="mt-1 text-xs text-memopyk-blue-gray">
									Ces notes sont uniquement visibles côté MEMOPYK et ne seront pas affichées au client.
								</p>
							</div>
							<div className="mt-2 border-t border-memopyk-dark-blue/10 pt-3 text-xs text-memopyk-blue-gray">
								<div className="flex justify-between gap-3">
									<span className="uppercase tracking-wide">Créé le</span>
									<span className="text-memopyk-dark-blue">{formatISO(quote.created_at)}</span>
								</div>
								<div className="mt-1 flex items-center justify-between gap-3">
									<span className="uppercase tracking-wide">Valide jusqu’au</span>
									<input
										id="quote-editor-valid-until"
										type="date"
										className="w-40 rounded-xl border border-memopyk-blue-gray/40 px-2 py-1 text-right text-xs text-memopyk-dark-blue"
										value={validityDateInput}
										onChange={(event) => {
											if (localError) setLocalError(null)
											if (updateMutation.isError) updateMutation.reset()
											setValidityDateInput(event.target.value)
										}}
										disabled={isReadOnlyMetadata || updateMutation.isPending}
									/>
								</div>
								<p className="mt-1 text-[11px] leading-snug text-memopyk-blue-gray">
									Vous pouvez ajuster la date de validité pour les devis en cours. Pour les devis déjà
										acceptés ou archivés, cette date est figée et le champ est désactivé.
								</p>
								<div className="mt-2 flex justify-between gap-3">
									<span className="uppercase tracking-wide">Devise</span>
									<span className="text-memopyk-dark-blue">{quote.currency_code}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-memopyk-dark-blue">Version courante</h2>
						<div className="mt-3 space-y-2 text-sm text-memopyk-blue-gray">
							<p className="font-medium text-memopyk-dark-blue">{versionTitle}</p>
							{version && (
								<>
									<p>
										Total TTC :{' '}
										<span className="font-semibold text-memopyk-dark-blue">{versionTotalLabel}</span>
									</p>
									<p>{versionLinesCount} ligne(s) dans ce devis.</p>
								</>
							)}
							{!version && (
								<p>
									Aucune version active pour l’instant. Vous pourrez créer et éditer des versions
									dans une prochaine étape de l’éditeur.
								</p>
							)}
							<p className="text-xs text-memopyk-blue-gray">
								Les lignes et blocs éditoriaux de cette version seront éditables ici, avec
									sauvegarde automatique et historique des changements.
							</p>
						</div>
					</div>

					<QuotePdfPanel quoteId={quote.id} versionId={version?.id ?? null} />

					<div>
						<QuoteVersionsBar quoteId={quote.id} currentVersionId={version?.id ?? null} />
					</div>

					<div className="rounded-3xl border border-dashed border-memopyk-dark-blue/20 bg-memopyk-cream/40 p-6 text-xs text-memopyk-blue-gray">
						<p className="font-semibold text-memopyk-dark-blue">Plan de l’éditeur</p>
						<ul className="mt-2 space-y-1 list-disc pl-4">
							<li>Métadonnées du devis (client, dates, devise).</li>
							<li>Gestion des versions et statut (brouillon, envoyé, accepté…).</li>
							<li>Lignes de devis avec totaux HT / TVA / TTC.</li>
							<li>Blocs éditoriaux (textes explicatifs, conditions particulières).</li>
							<li>Notes internes et suivi pour MEMOPYK.</li>
						</ul>
					</div>
				</aside>

				<main className="space-y-4">
					<section className="rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-memopyk-dark-blue">Suivi d’acceptation</h2>
						{quote.status === 'accepted' ? (
							<div className="mt-3 space-y-2 text-sm text-memopyk-blue-gray">
								<p className="text-memopyk-dark-blue">
									Ce devis a été{' '}
									<span className="font-semibold text-emerald-700">accepté</span>
									{' '}
									{acceptanceModeLabel !== '—' && (
										<span>
											({acceptanceModeLabel.toLowerCase()})
										</span>
									)}
									{acceptedAtLabel !== '—' && (
										<span>
											{' '}le {acceptedAtLabel}
										</span>
									)}
									.
								</p>
								{acceptedByName && (
									<p>
										Nom de la personne ayant accepté :{' '}
										<span className="font-medium text-memopyk-dark-blue">{acceptedByName}</span>
									</p>
								)}
								<p className="text-xs text-memopyk-blue-gray">
									Ce bloc est en lecture seule. Pour corriger le statut ou les informations
									d’acceptation, passez par la fiche admin du devis.
								</p>
							</div>
						) : (
							<div className="mt-3 space-y-2 text-sm text-memopyk-blue-gray">
								<p>
									Ce devis n’est pas encore accepté. Statut actuel :{' '}
									<span className="font-semibold text-memopyk-dark-blue">{statusLabel}</span>.
								</p>
								<p className="text-xs text-memopyk-blue-gray">
									L’acceptation en ligne ou sur papier est pilotée depuis la fiche admin. Ce bloc
									sert uniquement de récapitulatif dans l’éditeur.
								</p>
							</div>
						)}
					</section>

					{version ? (
						canEditLines ? (
							<QuoteLinesPanel
								quoteId={quote.id}
								versionId={version.id}
								lines={version.lines}
								currencyCode={quote.currency_code}
							/>
						) : (
							<section className="rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm">
								<h2 className="text-lg font-semibold text-memopyk-dark-blue">Lignes du devis</h2>
								<p className="mt-2 text-sm text-memopyk-blue-gray">
									Ce devis est {quote.status === 'accepted' ? 'accepté' : 'archivé'}. L’édition des lignes
									est désactivée dans l’éditeur. Vous pouvez consulter les détails dans la fiche admin.
								</p>
							</section>
						)
					) : (
						<section className="rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm">
							<h2 className="text-lg font-semibold text-memopyk-dark-blue">Lignes du devis</h2>
							<p className="mt-2 text-sm text-memopyk-blue-gray">
								Aucune version active n’est disponible pour le moment. Les lignes apparaîtront ici dès qu’une
									version aura été créée.
							</p>
						</section>
					)}
					<section className="rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-memopyk-dark-blue">Sections éditoriales</h2>
						<p className="mt-2 text-sm text-memopyk-blue-gray">
							Cette zone accueillera bientôt les blocs éditoriaux qui structurent l’histoire du devis et les
								options proposées au client.
						</p>
						<ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-memopyk-blue-gray">
							<li>
								<strong>Bloc d’introduction</strong> – texte d’ouverture pour poser le contexte et le projet du
									client.
							</li>
							<li>
								<strong>Blocs "histoire à raconter"</strong> – paragraphes qui expliquent le déroulé, les
									intentions créatives, le ton.
							</li>
							<li>
								<strong>Blocs "options et variantes"</strong> – sections qui présentent différentes formules ou
									ajouts possibles.
							</li>
							<li>
								<strong>Blocs pratiques</strong> – informations logistiques (lieux, dates, délais, livrables).
							</li>
						</ul>
						<p className="mt-3 text-xs text-memopyk-blue-gray">
							Ces blocs seront éditables directement dans l’éditeur, avec sauvegarde automatique et historique.
							Pour l’instant, cette section est en lecture seule.
						</p>
					</section>
					<ComingSoon
						title="Construction de devis en direct"
						description="Cette zone accueillera l’éditeur interactif avancé : organisation des blocs éditoriaux, options et outils de collaboration, avec sauvegarde automatique et synchronisation offline grâce aux endpoints `/api/quotes/*`."
						actions={
							<>
								<Button variant="outline" disabled>
									Ajouter une ligne (à venir)
								</Button>
								<Button variant="outline" disabled>
									Ajouter un bloc de texte (à venir)
								</Button>
							</>
						}
					/>
				</main>
			</div>
		</div>
	)
}
