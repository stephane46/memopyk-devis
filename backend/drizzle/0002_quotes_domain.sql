DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
        CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_version_status') THEN
        CREATE TYPE quote_version_status AS ENUM ('draft', 'current', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_line_kind') THEN
        CREATE TYPE quote_line_kind AS ENUM ('product', 'service', 'text');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_activity_type') THEN
        CREATE TYPE quote_activity_type AS ENUM ('created', 'updated', 'status_changed', 'line_changed', 'version_published', 'attachment_added', 'attachment_removed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_kind') THEN
        CREATE TYPE attachment_kind AS ENUM ('general', 'signed_acceptance', 'supporting');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(32) NOT NULL,
    client_id UUID NOT NULL,
    status quote_status NOT NULL DEFAULT 'draft',
    title TEXT,
    customer_name TEXT,
    summary TEXT,
    currency_code VARCHAR(3) NOT NULL,
    valid_until DATE,
    deposit_pct NUMERIC(5,4) DEFAULT 0,
    current_version_id UUID,
    metadata JSONB,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quotes_number_unique ON quotes(number);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON quotes(created_at);

CREATE TABLE IF NOT EXISTS quote_number_counters (
    year INTEGER PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    label TEXT,
    status quote_version_status NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL,
    intro TEXT,
    notes TEXT,
    currency_code VARCHAR(3) NOT NULL,
    validity_date DATE,
    deposit_pct NUMERIC(5,4) DEFAULT 0,
    totals_net_cents INTEGER NOT NULL DEFAULT 0,
    totals_tax_cents INTEGER NOT NULL DEFAULT 0,
    totals_gross_cents INTEGER NOT NULL DEFAULT 0,
    totals_deposit_cents INTEGER NOT NULL DEFAULT 0,
    totals_balance_cents INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quote_versions_quote_number_unique ON quote_versions(quote_id, version_number);
CREATE INDEX IF NOT EXISTS quote_versions_status_idx ON quote_versions(status);

CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    kind quote_line_kind NOT NULL,
    ref_id TEXT,
    label TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    tax_rate_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
    discount_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
    optional BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL,
    net_amount_cents INTEGER NOT NULL DEFAULT 0,
    tax_amount_cents INTEGER NOT NULL DEFAULT 0,
    gross_amount_cents INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quote_lines_version_position_unique ON quote_lines(version_id, position);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_id UUID REFERENCES quote_versions(id) ON DELETE SET NULL,
    type quote_activity_type NOT NULL,
    actor TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_quote_id_idx ON activities(quote_id);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_id UUID REFERENCES quote_versions(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    url TEXT NOT NULL,
    kind attachment_kind NOT NULL DEFAULT 'general',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_quote_id_idx ON attachments(quote_id);

ALTER TABLE quotes
    ADD CONSTRAINT quotes_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES quote_versions(id) ON DELETE SET NULL;
