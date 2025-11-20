DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_activity_type') THEN
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'version_locked';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'version_limit_reached';
    END IF;
END $$;
