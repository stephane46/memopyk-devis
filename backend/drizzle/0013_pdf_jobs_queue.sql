CREATE TABLE IF NOT EXISTS pdf_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    file_url TEXT,
    error_code TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pdf_jobs_quote_version_idx ON pdf_jobs(quote_id, version_id);
CREATE INDEX IF NOT EXISTS pdf_jobs_status_idx ON pdf_jobs(status);
