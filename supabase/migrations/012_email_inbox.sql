-- ============================================================
-- SOLVIX.AI - EMAIL INBOX PROCESSING
-- ============================================================

-- User inbox configuration
ALTER TABLE settings ADD COLUMN IF NOT EXISTS inbox_code TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS inbox_enabled BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS inbox_auto_process BOOLEAN DEFAULT true;

-- Generate unique inbox codes for existing users
UPDATE settings SET inbox_code = substr(md5(random()::text), 1, 8)
WHERE inbox_code IS NULL AND user_id != 'default';

-- Email processing log
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attachments_count INTEGER DEFAULT 0,
  documents_created INTEGER DEFAULT 0,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed', 'no_attachments')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_settings_inbox_code ON settings(inbox_code);

-- RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own email logs" ON email_log
  FOR SELECT USING (auth.uid()::text = user_id);

-- Migration record
INSERT INTO schema_migrations (version, name) 
VALUES ('012', 'email_inbox')
ON CONFLICT (version) DO NOTHING;
