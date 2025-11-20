export type JsonError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export interface QuoteListItem {
  id: string;
  number: string;
  title?: string | null;
  customer_name: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'archived';
  created_at: string;
  totals_gross_cents: number;
  currency_code: string;
}

export interface QuoteAggregate {
  id: string;
  number: string;
  title?: string | null;
  customer_name: string | null;
  summary?: string | null;
  status: QuoteListItem['status'];
  created_at: string;
  validity_date?: string | null;
  acceptanceMode: 'online' | 'paper' | null;
  acceptedAt: string | null;
  acceptedByName?: string | null;
  currency_code: string;
  current_version?: {
    id: string;
    version_number: number;
    title?: string | null;
    label?: string | null;
    totals_net_cents: number;
    totals_tax_cents: number;
    totals_gross_cents: number;
    totals_deposit_cents: number;
    totals_balance_cents: number;
    pdf_url?: string | null;
    pdf_generated_at?: string | null;
    lines: Array<{
      id: string;
      position: number;
      description: string;
      quantity: number;
      unit_cents: number;
      tax_rate_pct: number;
      totals_gross_cents: number;
    }>;
  } | null;
  // Optional list of versions when the API exposes them, used for public version selector
  versions?: QuoteVersionSummary[] | null;
}

export interface QuoteVersionSummary {
  id: string;
  version_number: number;
  label?: string | null;
  status: 'draft' | 'current' | 'archived';
  is_locked: boolean;
  created_at: string;
}

export interface QuoteVersionsListResponse {
  data: QuoteVersionSummary[];
}

export type QuotePdfJobStatus = {
  jobId: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string | null;
  generatedAt?: string | null;
};

export interface QuoteListResponse {
  data: QuoteListItem[];
}

export interface QuoteAggregateResponse {
  data: QuoteAggregate;
}

// Basic payload for online acceptance via the public quote view.
// Shape is aligned with the backend spec (full_name + CGV checkbox) and can be
// extended later if the acceptance summary requires more fields.
export interface OnlineAcceptancePayload {
  full_name: string;
  accept_cgv: boolean;
}
