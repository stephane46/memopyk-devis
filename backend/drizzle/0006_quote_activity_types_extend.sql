DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_activity_type') THEN
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'freeze';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'send';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'view';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'accept';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'decline';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'sync_conflict';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'offline_write';
    END IF;
END $$;
