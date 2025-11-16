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
}

type QuoteFullApi = {
  quote: QuoteEntityApi
  currentVersion: QuoteVersionApi | null
  lines?: QuoteLineApi[]
}

type QuoteListItemApi = {
  quote: QuoteEntityApi
  currentVersion: QuoteVersionApi | null
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
    lines: (version.lines ?? []).map(mapQuoteLine),
  }
}

function mapQuoteAggregate(payload: QuoteFullApi): QuoteAggregate {
  const { quote, currentVersion } = payload

  return {
    id: quote.id,
    number: quote.number,
    title: quote.title ?? null,
    customer_name: quote.customerName ?? null,
    summary: quote.summary ?? null,
    status: quote.status as QuoteAggregate['status'],
    created_at: quote.createdAt,
    validity_date: quote.validUntil ?? null,
    currency_code: quote.currencyCode,
    current_version: mapQuoteVersion(currentVersion),
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

export function getPublicQuote(token: string, pin?: string): Promise<QuoteAggregateResponse> {
	const search = new URLSearchParams()
	if (pin) search.set('pin', pin)
	const qs = search.toString() ? `?${search.toString()}` : ''

	return http<{ data: QuoteFullApi }>(`/api/public/${encodeURIComponent(token)}${qs}`).then(
		(res) => ({ data: mapQuoteAggregate(res.data) }),
	)
}

export function acceptQuoteOnline(
	token: string,
	payload: OnlineAcceptancePayload,
): Promise<void> {
	return http<unknown>(`/api/public/${encodeURIComponent(token)}/accept`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}).then(() => undefined)
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
