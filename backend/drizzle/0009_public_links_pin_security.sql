DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_public_links') THEN
        BEGIN
            ALTER TABLE quote_public_links ADD COLUMN IF NOT EXISTS pin_hash TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE quote_public_links ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE quote_public_links ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE quote_public_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;
    END IF;
END $$;
