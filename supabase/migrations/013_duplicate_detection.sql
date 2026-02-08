-- ============================================================
-- SOLVIX.AI - DUPLICATE DETECTION
-- ============================================================

-- Add content hash column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_duplicate_of ON documents(duplicate_of);

-- Migration record
INSERT INTO schema_migrations (version, name) 
VALUES ('013', 'duplicate_detection')
ON CONFLICT (version) DO NOTHING;
