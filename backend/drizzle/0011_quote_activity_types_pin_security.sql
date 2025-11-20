DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_activity_type') THEN
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'pin_failed';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'pin_locked';
        ALTER TYPE quote_activity_type ADD VALUE IF NOT EXISTS 'pin_verified';
    END IF;
END $$;
