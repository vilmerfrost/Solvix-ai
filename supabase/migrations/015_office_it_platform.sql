-- ============================================================
-- SOLVIX.AI - OFFICE/IT PLATFORM FOUNDATION
-- Adds domain-aware processing, schemas, workflow, SLA, and connectors
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- SETTINGS EXTENSIONS
-- ------------------------------------------------------------
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS default_document_domain TEXT DEFAULT 'waste';

-- ------------------------------------------------------------
-- DOCUMENTS EXTENSIONS
-- ------------------------------------------------------------
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS document_domain TEXT DEFAULT 'waste',
  ADD COLUMN IF NOT EXISTS doc_type TEXT,
  ADD COLUMN IF NOT EXISTS schema_id UUID,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER,
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS assigned_reviewer_id TEXT,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_documents_domain ON documents(document_domain);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents(review_status);

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on user_roles" ON user_roles
  FOR ALL USING (true);

-- ------------------------------------------------------------
-- SCHEMA TEMPLATES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  document_domain TEXT NOT NULL DEFAULT 'office_it',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  current_version INTEGER NOT NULL DEFAULT 1,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schema_id UUID NOT NULL REFERENCES schema_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, version)
);

CREATE TABLE IF NOT EXISTS schema_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schema_id UUID NOT NULL REFERENCES schema_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  enum_values JSONB DEFAULT '[]'::jsonb,
  validators JSONB DEFAULT '{}'::jsonb,
  aliases JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, field_key)
);

CREATE TABLE IF NOT EXISTS schema_table_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schema_id UUID NOT NULL REFERENCES schema_templates(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  label TEXT NOT NULL,
  row_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, section_key)
);

CREATE TABLE IF NOT EXISTS schema_validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schema_id UUID NOT NULL REFERENCES schema_templates(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'blocking')),
  expression JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, rule_key)
);

ALTER TABLE schema_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_table_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on schema_templates" ON schema_templates FOR ALL USING (true);
CREATE POLICY "Allow all operations on schema_template_versions" ON schema_template_versions FOR ALL USING (true);
CREATE POLICY "Allow all operations on schema_fields" ON schema_fields FOR ALL USING (true);
CREATE POLICY "Allow all operations on schema_table_sections" ON schema_table_sections FOR ALL USING (true);
CREATE POLICY "Allow all operations on schema_validation_rules" ON schema_validation_rules FOR ALL USING (true);

-- ------------------------------------------------------------
-- CLASSIFICATION
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_doc_type TEXT,
  target_schema_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  model_doc_type TEXT,
  model_confidence NUMERIC,
  rule_doc_type TEXT,
  final_doc_type TEXT,
  schema_id UUID,
  decision_source TEXT NOT NULL DEFAULT 'model',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on classification_rules" ON classification_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations on document_classifications" ON document_classifications FOR ALL USING (true);

-- ------------------------------------------------------------
-- REVIEW WORKFLOW
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'assigned', 'in_review', 'changes_requested', 'approved', 'rejected')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  due_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_task_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES review_tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE review_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_task_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on review_tasks" ON review_tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on review_task_events" ON review_task_events FOR ALL USING (true);

-- ------------------------------------------------------------
-- SLA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sla_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  warning_minutes INTEGER NOT NULL DEFAULT 60,
  breach_minutes INTEGER NOT NULL DEFAULT 240,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, doc_type)
);

CREATE TABLE IF NOT EXISTS sla_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES review_tasks(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  doc_type TEXT,
  risk_level TEXT NOT NULL DEFAULT 'none' CHECK (risk_level IN ('none', 'warning', 'breach')),
  reason TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on sla_rules" ON sla_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations on sla_evaluations" ON sla_evaluations FOR ALL USING (true);

-- ------------------------------------------------------------
-- CONNECTORS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('sharepoint', 'google_drive')),
  name TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'dead_letter')),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connector_sync_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES connector_sync_jobs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  source_path TEXT,
  content_hash TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'skipped', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, source_item_id, content_hash)
);

ALTER TABLE connector_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on connector_accounts" ON connector_accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on connector_sync_jobs" ON connector_sync_jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations on connector_sync_items" ON connector_sync_items FOR ALL USING (true);

-- ------------------------------------------------------------
-- BACKFILL DEFAULT DOMAIN
-- ------------------------------------------------------------
UPDATE settings
SET default_document_domain = CASE
  WHEN industry IS NOT NULL AND industry <> 'waste' THEN 'office_it'
  ELSE 'waste'
END
WHERE default_document_domain IS NULL OR default_document_domain = 'waste';

UPDATE documents d
SET document_domain = CASE
  WHEN s.industry IS NOT NULL AND s.industry <> 'waste' THEN 'office_it'
  ELSE 'waste'
END,
doc_type = CASE
  WHEN (s.industry IS NOT NULL AND s.industry <> 'waste') AND d.doc_type IS NULL THEN 'unknown_office'
  ELSE d.doc_type
END,
review_status = CASE
  WHEN (s.industry IS NOT NULL AND s.industry <> 'waste') AND d.review_status IS NULL THEN 'new'
  ELSE COALESCE(d.review_status, 'new')
END
FROM settings s
WHERE d.user_id = s.user_id
  AND (d.document_domain IS NULL OR d.document_domain = 'waste');
