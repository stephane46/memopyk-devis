CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    rate_bps INTEGER NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_code_unique ON tax_rates(code);
CREATE INDEX IF NOT EXISTS tax_rates_default_active_idx ON tax_rates(is_default, is_active);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    default_unit_price_cents INTEGER,
    default_tax_rate_id UUID REFERENCES tax_rates(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_internal_code_unique ON products(internal_code);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active);

CREATE TABLE IF NOT EXISTS branding_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    company_name TEXT,
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    pdf_footer_text TEXT,
    default_validity_days INTEGER,
    default_deposit_pct INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS branding_configs_label_unique ON branding_configs(label);
