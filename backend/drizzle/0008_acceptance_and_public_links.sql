DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quotes') THEN
        BEGIN
            ALTER TABLE quotes ADD COLUMN IF NOT EXISTS acceptance_mode TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_by_name TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS quote_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_public_links_quote_id_idx ON quote_public_links(quote_id);
CREATE UNIQUE INDEX IF NOT EXISTS quote_public_links_token_unique ON quote_public_links(token);
