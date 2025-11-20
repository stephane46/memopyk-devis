DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_activity_type') THEN
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'public_link_updated';
    END IF;
END $$;
