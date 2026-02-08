-- ============================================================
-- SOLVIX.AI - AUDIT TRAIL
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL CHECK (action IN (
    'document.uploaded',
    'document.processed',
    'document.reviewed',
    'document.approved',
    'document.rejected',
    'document.exported',
    'document.archived',
    'document.deleted',
    'document.edited',
    'document.duplicate_detected',
    'export.excel',
    'export.csv',
    'export.fortnox',
    'export.azure',
    'settings.changed',
    'user.login',
    'user.api_key_added',
    'user.api_key_removed'
  )),
  
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own audit logs" ON audit_log
  FOR SELECT USING (auth.uid()::text = user_id);

-- Migration record
INSERT INTO schema_migrations (version, name) 
VALUES ('014', 'audit_trail')
ON CONFLICT (version) DO NOTHING;
