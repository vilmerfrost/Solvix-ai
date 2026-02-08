-- ============================================================
-- SOLVIX.AI - SCHEMA MIGRATIONS TRACKING
-- Tracks which migrations have been applied
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert record for this migration
INSERT INTO schema_migrations (version, name) 
VALUES ('001', 'schema_migrations_table')
ON CONFLICT (version) DO NOTHING;
