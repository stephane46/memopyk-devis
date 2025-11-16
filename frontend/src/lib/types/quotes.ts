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
};

export interface QuoteListResponse {
  data: QuoteListItem[];
}

export interface QuoteAggregateResponse {
  data: QuoteAggregate;
}

// Basic payload for online acceptance via the public quote view.
// Shape is aligned with the backend spec (name + CGV checkbox) and can be
// extended later if the acceptance summary requires more fields.
export interface OnlineAcceptancePayload {
  name: string;
  accept_cgv: boolean;
}
