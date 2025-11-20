import type {
  JsonError,
  QuoteAggregate,
  QuoteAggregateResponse,
  QuoteListResponse,
  QuotePdfJobStatus,
  QuoteVersionSummary,
  QuoteVersionsListResponse,
  OnlineAcceptancePayload,
} from './types/quotes'

type ImportMetaEnv = {
  VITE_API_BASE_URL?: string;
};

const BASE_URL = ((import.meta as { env?: ImportMetaEnv }).env?.VITE_API_BASE_URL ?? '/')
  .replace(/\/$/, '')

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    const err = (json as JsonError | null) ?? {
      error: { code: 'HTTP_ERROR', message: res.statusText },
    }
    throw Object.assign(new Error(err.error.message), {
      status: res.status,
      code: err.error.code,
      details: err.error.details,
    })
  }

  return json as T
}

type QuoteLineApi = {
  id: string
  position: number
  description?: string | null
  label?: string | null
  quantity: string
  unitPriceCents: number
  taxRatePct: string
  grossAmountCents: number
}

type QuoteVersionApi = {
  id: string
  versionNumber: number
  title?: string | null
  label?: string | null
  totalsNetCents: number
  totalsTaxCents: number
  totalsGrossCents: number
  totalsDepositCents: number
  totalsBalanceCents: number
  depositPct?: string | null
  lines?: QuoteLineApi[]
  pdfUrl?: string | null
  pdfGeneratedAt?: string | null
}

type QuoteVersionListItemApi = {
  id: string
  versionNumber: number
  label?: string | null
  status: 'draft' | 'current' | 'archived'
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

type QuoteEntityApi = {
  id: string
  number: string
  title?: string | null
  customerName?: string | null
  summary?: string | null
  status: string
  createdAt: string
  updatedAt: string
  currencyCode: string
  validUntil?: string | null
  acceptanceMode?: 'online' | 'paper' | null
  acceptance_mode?: 'online' | 'paper' | null
  acceptedAt?: string | null
  accepted_at?: string | null
  acceptedByName?: string | null
  accepted_by_name?: string | null
}

type QuoteFullApi = {
  quote: QuoteEntityApi
  currentVersion: QuoteVersionApi | null
  lines?: QuoteLineApi[]
  versions?: QuoteVersionListItemApi[]
}

type QuoteListItemApi = {
  quote: QuoteEntityApi
  currentVersion: QuoteVersionApi | null
}

// Public quote view DTO exposed by /v1/public/quotes/:token
type QuotePublicViewApi = {
	quote: {
		number: string
		customer_name: string | null
		status: string
		acceptance_mode: 'online' | 'paper' | null
		accepted_at: string | null
		accepted_by_name: string | null
		created_at: string
		valid_until: string | null
		currency_code: string
	}
	current_version: {
		id: string
		title: string
		validity_date: string | null
		totals_net_cents: number
		totals_tax_cents: number
		totals_gross_cents: number
		totals_deposit_cents: number
		totals_balance_cents: number
	} | null
	lines: Array<{
		id: string
		label: string
		description: string | null
		quantity: string
		unit_price_cents: number
		tax_rate_pct: string
		discount_pct: string
		optional: boolean
		position: number
		net_amount_cents: number
		tax_amount_cents: number
		gross_amount_cents: number
	}>
}

function parseQuantity(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function parseTaxRate(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function mapQuoteLine(line: QuoteLineApi) {
  return {
    id: line.id,
    position: line.position,
    description: line.description ?? line.label ?? '',
    quantity: parseQuantity(line.quantity),
    unit_cents: line.unitPriceCents,
    tax_rate_pct: parseTaxRate(line.taxRatePct),
    totals_gross_cents: line.grossAmountCents,
  }
}

function mapPublicViewToAggregate(token: string, payload: QuotePublicViewApi): QuoteAggregate {
	const { quote, current_version, lines } = payload

	const mappedLines = lines.map((line) => ({
		id: line.id,
		position: line.position,
		description: line.description ?? line.label ?? '',
		quantity: parseQuantity(line.quantity),
		unit_cents: line.unit_price_cents,
		tax_rate_pct: parseTaxRate(line.tax_rate_pct),
		totals_gross_cents: line.gross_amount_cents,
	}))

	return {
		// Use a synthetic id to distinguish public aggregates from admin ones.
		// Admin flows never rely on ids coming from the public endpoints.
		id: `public:${token}`,
		number: quote.number,
		title: null,
		customer_name: quote.customer_name,
		summary: undefined,
		status: quote.status as QuoteAggregate['status'],
		created_at: quote.created_at,
		validity_date: quote.valid_until,
		acceptanceMode: (quote.acceptance_mode ?? null) as QuoteAggregate['acceptanceMode'],
		acceptedAt: quote.accepted_at,
		acceptedByName: quote.accepted_by_name,
		currency_code: quote.currency_code,
		current_version: current_version
			? {
				id: current_version.id,
				version_number: 1,
				title: current_version.title ?? null,
				label: null,
				totals_net_cents: current_version.totals_net_cents,
				totals_tax_cents: current_version.totals_tax_cents,
				totals_gross_cents: current_version.totals_gross_cents,
				totals_deposit_cents: current_version.totals_deposit_cents,
				totals_balance_cents: current_version.totals_balance_cents,
				pdf_url: null,
				pdf_generated_at: null,
				lines: mappedLines,
			}
			: null,
		// The public DTO does not expose version history; keep this null.
		versions: null,
	}
}

function mapQuoteVersionSummary(version: QuoteVersionListItemApi): QuoteVersionSummary {
  return {
    id: version.id,
    version_number: version.versionNumber,
    label: version.label ?? null,
    status: version.status,
    is_locked: version.isLocked,
    created_at: version.createdAt,
  }
}

function mapQuoteVersion(version: QuoteVersionApi | null): QuoteAggregate['current_version'] {
  if (!version) {
    return null
  }

  return {
    id: version.id,
    version_number: version.versionNumber,
    title: version.title ?? null,
    label: version.label ?? null,
    totals_net_cents: version.totalsNetCents,
    totals_tax_cents: version.totalsTaxCents,
    totals_gross_cents: version.totalsGrossCents,
    totals_deposit_cents: version.totalsDepositCents,
    totals_balance_cents: version.totalsBalanceCents,
    pdf_url: version.pdfUrl ?? null,
    pdf_generated_at: version.pdfGeneratedAt ?? null,
    lines: (version.lines ?? []).map(mapQuoteLine),
  }
}

function mapQuoteAggregate(payload: QuoteFullApi): QuoteAggregate {
  const { quote, currentVersion, versions } = payload

  return {
    id: quote.id,
    number: quote.number,
    title: quote.title ?? null,
    customer_name: quote.customerName ?? null,
    summary: quote.summary ?? null,
    status: quote.status as QuoteAggregate['status'],
    created_at: quote.createdAt,
    validity_date: quote.validUntil ?? null,
    acceptanceMode: quote.acceptanceMode ?? quote.acceptance_mode ?? null,
    acceptedAt: quote.acceptedAt ?? quote.accepted_at ?? null,
    acceptedByName: quote.acceptedByName ?? quote.accepted_by_name ?? null,
    currency_code: quote.currencyCode,
    current_version: mapQuoteVersion(currentVersion),
    versions: versions ? versions.map(mapQuoteVersionSummary) : null,
  }
}

function mapQuoteListItem(payload: QuoteListItemApi) {
  const { quote, currentVersion } = payload
  return {
    id: quote.id,
    number: quote.number,
    title: quote.title ?? null,
    customer_name: quote.customerName ?? null,
    status: quote.status as QuoteListResponse['data'][number]['status'],
    created_at: quote.createdAt,
    totals_gross_cents: currentVersion?.totalsGrossCents ?? 0,
    currency_code: quote.currencyCode,
  }
}

export function listQuotes(params?: {
  q?: string
  status?: string
  page?: number
  page_size?: number
}) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.status) search.set('status', params.status)
  if (params?.page) search.set('page', String(params.page))
  if (params?.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString() ? `?${search.toString()}` : ''
  return http<{ data: QuoteListItemApi[] }>(`/v1/quotes${qs}`).then((res) => ({
    data: res.data.map(mapQuoteListItem),
  }))
}

export function getQuote(quoteId: string) {
  return http<{ data: QuoteFullApi }>(`/v1/quotes/${encodeURIComponent(quoteId)}`).then((res) => ({
    data: mapQuoteAggregate(res.data),
  }))
}

export interface CreateQuoteLinePayload {
  description: string
  qty: number
  unit_amount_cents: number
  tax_rate_bps: number
  product_id?: string
  position?: number
}

export interface CreateQuotePayload {
  title: string
  customer_name: string
  notes?: string
  currency: string
  lines: CreateQuoteLinePayload[]
}

export type CreateQuoteResponse = QuoteAggregate

export function createQuote(payload: CreateQuotePayload) {
  return http<{ data: QuoteFullApi }>(`/v1/quotes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => mapQuoteAggregate(res.data))
}

export interface UpdateQuotePayload {
  title?: string
  customer_name?: string
  notes?: string
  valid_until?: string | null
}

export function updateQuote(quoteId: string, payload: UpdateQuotePayload) {
  return http<{ data: QuoteFullApi }>(`/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => mapQuoteAggregate(res.data))
}

export function listQuoteVersions(quoteId: string): Promise<QuoteVersionsListResponse> {
  return http<{ data: QuoteVersionListItemApi[] }>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions`,
  ).then((res) => ({
    data: res.data.map(mapQuoteVersionSummary),
  }))
}

export interface CreateQuoteVersionPayload {
  from_version_id?: string
}

export function createQuoteVersion(
  quoteId: string,
  payload?: CreateQuoteVersionPayload,
): Promise<QuoteVersionSummary> {
  return http<{ data: QuoteVersionListItemApi }>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions`,
    {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    },
  ).then((res) => mapQuoteVersionSummary(res.data))
}

export function publishQuoteVersion(quoteId: string, versionId: string): Promise<void> {
  return http<null>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions/${encodeURIComponent(versionId)}/publish`,
    {
      method: 'POST',
    },
  ).then(() => undefined)
}

export type UpdateQuoteLinePayload = Partial<CreateQuoteLinePayload>

interface RequestQuotePdfPayload {
	version_id: string
}

export function requestQuotePdf(quoteId: string, versionId: string): Promise<QuotePdfJobStatus> {
	const payload: RequestQuotePdfPayload = { version_id: versionId }

	return http<QuotePdfJobStatus>(
		`/api/quotes/${encodeURIComponent(quoteId)}/pdf`,
		{
			method: 'POST',
			body: JSON.stringify(payload),
		},
	)
}

export function getQuotePdfJob(jobId: string): Promise<QuotePdfJobStatus> {
	return http<QuotePdfJobStatus>(`/api/pdf/jobs/${encodeURIComponent(jobId)}`)
}

export function getPublicQuote(token: string): Promise<QuoteAggregateResponse> {
	return http<{ data: QuotePublicViewApi }>(
		`/v1/public/quotes/${encodeURIComponent(token)}`,
	).then((res) => ({ data: mapPublicViewToAggregate(token, res.data) }))
}

export function acceptQuoteOnline(
	token: string,
	payload: OnlineAcceptancePayload,
): Promise<void> {
	return http<{ data: QuotePublicViewApi }>(
		`/v1/public/quotes/${encodeURIComponent(token)}/accept`,
		{
			method: 'POST',
			body: JSON.stringify(payload),
		},
	).then(() => undefined)
}

export function submitPublicPin(
	token: string,
	pin: string,
): Promise<{ pin_valid: true }> {
	return http<{ data: { pin_valid: true } }>(
		`/v1/public/quotes/${encodeURIComponent(token)}/pin`,
		{
			method: 'POST',
			body: JSON.stringify({ pin }),
		},
	).then((res) => res.data)
}

export function acceptQuoteOnPaper(quoteId: string): Promise<void> {
	return http<unknown>(`/api/quotes/${encodeURIComponent(quoteId)}/accept-paper`, {
		method: 'POST',
	}).then(() => undefined)
}

export function createQuoteLine(
  quoteId: string,
  versionId: string,
  payload: CreateQuoteLinePayload,
) {
  return http<unknown>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions/${encodeURIComponent(versionId)}/lines`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  ).then(() => undefined)
}

export function updateQuoteLine(
  quoteId: string,
  versionId: string,
  lineId: string,
  payload: UpdateQuoteLinePayload,
) {
  return http<unknown>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions/${encodeURIComponent(
      versionId,
    )}/lines/${encodeURIComponent(lineId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  ).then(() => undefined)
}

export function deleteQuoteLine(quoteId: string, versionId: string, lineId: string) {
  return http<unknown>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/versions/${encodeURIComponent(
      versionId,
    )}/lines/${encodeURIComponent(lineId)}`,
    {
      method: 'DELETE',
    },
  ).then(() => undefined)
}

export interface AdminTaxRate {
  id: string
  name: string
  code: string
  rate_bps: number
  is_default: boolean
  is_active: boolean
}

export interface AdminTaxRateListResponse {
  data: AdminTaxRate[]
}

export interface CreateAdminTaxRatePayload {
  name: string
  code: string
  rate_bps: number
  is_default: boolean
}

export type UpdateAdminTaxRatePayload = Partial<CreateAdminTaxRatePayload>

export function listAdminTaxRates(): Promise<AdminTaxRateListResponse> {
  return http<AdminTaxRateListResponse>('/v1/admin/tax-rates')
}

export function createAdminTaxRate(payload: CreateAdminTaxRatePayload): Promise<AdminTaxRate> {
  return http<{ data: AdminTaxRate }>('/v1/admin/tax-rates', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}

export function updateAdminTaxRate(
  id: string,
  payload: UpdateAdminTaxRatePayload,
): Promise<AdminTaxRate> {
  return http<{ data: AdminTaxRate }>(`/v1/admin/tax-rates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}

export interface AdminProduct {
  id: string
  internal_code: string | null
  name: string
  description: string | null
  default_unit_price_cents: number | null
  default_tax_rate_id: string | null
  is_active: boolean
}

export interface AdminProductListResponse {
  data: AdminProduct[]
}

export interface CreateAdminProductPayload {
  internal_code?: string
  name: string
  description?: string
  default_unit_price_cents: number
  default_tax_rate_id?: string | null
}

export type UpdateAdminProductPayload = Partial<CreateAdminProductPayload>

export function listAdminProducts(): Promise<AdminProductListResponse> {
  return http<AdminProductListResponse>('/v1/admin/products')
}

export function createAdminProduct(payload: CreateAdminProductPayload): Promise<AdminProduct> {
  return http<{ data: AdminProduct }>('/v1/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}

export function updateAdminProduct(
  id: string,
  payload: UpdateAdminProductPayload,
): Promise<AdminProduct> {
  return http<{ data: AdminProduct }>(`/v1/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}

export interface AdminBrandingConfig {
  id: string
  label: string
  company_name: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  pdf_footer_text: string | null
  default_validity_days: number | null
  default_deposit_pct: number | null
}

export interface AdminBrandingGetResponse {
  data: AdminBrandingConfig | null
}

export interface AdminBrandingUpdatePayload {
  label: string
  company_name?: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  pdf_footer_text?: string
  default_validity_days?: number
  default_deposit_pct?: number
}

export function getAdminBranding(): Promise<AdminBrandingGetResponse> {
  return http<AdminBrandingGetResponse>('/v1/admin/branding')
}

export function updateAdminBranding(
  payload: AdminBrandingUpdatePayload,
): Promise<AdminBrandingConfig> {
  return http<{ data: AdminBrandingConfig }>('/v1/admin/branding', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}
