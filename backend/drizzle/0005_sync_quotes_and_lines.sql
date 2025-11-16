BEGIN;

-- Section 1: Sync `public.quotes` table
-- Add any missing columns first, without NOT NULL, to avoid errors on existing rows
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS number VARCHAR(32);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status quote_status;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deposit_pct NUMERIC(5,4);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS current_version_id UUID;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Now, apply defaults and constraints
ALTER TABLE public.quotes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.quotes ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN client_id DROP NOT NULL; -- Make nullable
ALTER TABLE public.quotes ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.quotes ALTER COLUMN number SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.quotes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.quotes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN deposit_pct SET DEFAULT 0;

-- Section 2: Sync `public.quote_lines` table
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS version_id UUID;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS kind quote_line_kind;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS ref_id TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS tax_rate_pct NUMERIC(5,4);
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,4);
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS optional BOOLEAN;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS position INTEGER;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS net_amount_cents INTEGER;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS tax_amount_cents INTEGER;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS gross_amount_cents INTEGER;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Now, apply defaults and constraints
ALTER TABLE public.quote_lines ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.quote_lines ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN version_id SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN kind SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN label SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN quantity SET DEFAULT '1';
ALTER TABLE public.quote_lines ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN unit_price_cents SET DEFAULT 0;
ALTER TABLE public.quote_lines ALTER COLUMN unit_price_cents SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN tax_rate_pct SET DEFAULT '0';
ALTER TABLE public.quote_lines ALTER COLUMN tax_rate_pct SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN discount_pct SET DEFAULT '0';
ALTER TABLE public.quote_lines ALTER COLUMN discount_pct SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN optional SET DEFAULT FALSE;
ALTER TABLE public.quote_lines ALTER COLUMN optional SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN position SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN net_amount_cents SET DEFAULT 0;
ALTER TABLE public.quote_lines ALTER COLUMN net_amount_cents SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN tax_amount_cents SET DEFAULT 0;
ALTER TABLE public.quote_lines ALTER COLUMN tax_amount_cents SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN gross_amount_cents SET DEFAULT 0;
ALTER TABLE public.quote_lines ALTER COLUMN gross_amount_cents SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.quote_lines ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.quote_lines ALTER COLUMN updated_at SET NOT NULL;

-- Section 3: Recreate primary keys and unique indexes
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_pkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);

ALTER TABLE public.quote_lines DROP CONSTRAINT IF EXISTS quote_lines_pkey;
ALTER TABLE public.quote_lines ADD CONSTRAINT quote_lines_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS quotes_number_unique ON public.quotes(number);
CREATE UNIQUE INDEX IF NOT EXISTS quote_lines_version_position_unique ON public.quote_lines(version_id, position);

COMMIT;
