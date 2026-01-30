-- ============================================================
-- VEXTRA AI - COMPLETE DATABASE SETUP
-- Run this single file to set up a fresh Supabase project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE DEFAULT 'default',
  
  -- AI Automation Settings
  auto_approve_threshold INTEGER DEFAULT 80 CHECK (auto_approve_threshold >= 60 AND auto_approve_threshold <= 99),
  enterprise_auto_approve BOOLEAN DEFAULT false,
  
  -- Material Synonyms Library
  material_synonyms JSONB DEFAULT '{
    "Trä": ["Brädor", "Virke", "Lastpall", "Spont"],
    "Gips": ["Gipsskivor", "Rivningsgips", "Gipsspill"],
    "Betong": ["Armerad betong", "Betongkross"],
    "Brännbart": ["Restavfall", "Blandat brännbart"]
  }'::jsonb,
  
  -- Verification settings
  enable_verification BOOLEAN DEFAULT false,
  verification_confidence_threshold NUMERIC DEFAULT 0.85,
  
  -- Azure folder settings
  azure_input_folders JSONB DEFAULT '[]'::jsonb,
  azure_output_folder TEXT DEFAULT 'completed',
  
  -- Tenant branding (white-label)
  company_name TEXT DEFAULT 'Vextra AI',
  company_slug TEXT DEFAULT 'vextra-ai',
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#6366F1',
  language TEXT DEFAULT 'sv',
  is_setup_complete BOOLEAN DEFAULT false,
  known_receivers JSONB DEFAULT '["Ragn-Sells", "Renova", "NSR", "SITA", "Stena Recycling"]'::jsonb,
  
  -- AI Model preferences
  preferred_model TEXT DEFAULT 'gemini-3-flash',
  custom_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for settings
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy for settings
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;
CREATE POLICY "Allow all operations on settings" ON settings
  FOR ALL USING (true);

-- Insert default settings
INSERT INTO settings (
  user_id, 
  auto_approve_threshold, 
  material_synonyms,
  company_name,
  is_setup_complete
)
VALUES (
  'default', 
  80, 
  '{
    "Trä": ["Brädor", "Virke", "Lastpall", "Spont"],
    "Gips": ["Gipsskivor", "Rivningsgips", "Gipsspill"],
    "Betong": ["Armerad betong", "Betongkross"],
    "Brännbart": ["Restavfall", "Blandat brännbart"]
  }'::jsonb,
  'Vextra AI',
  false
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. DOCUMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT DEFAULT 'default',
  
  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  
  -- Azure tracking
  azure_blob_path TEXT,
  azure_original_filename TEXT,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'needs_review', 'verified', 'approved', 'error', 'archived')),
  processing_stage TEXT,
  error_message TEXT,
  
  -- Extracted data
  extracted_data JSONB DEFAULT '{}'::jsonb,
  rows_data JSONB DEFAULT '[]'::jsonb,
  
  -- Quality metrics
  confidence_score NUMERIC,
  quality_score INTEGER,
  verification_status TEXT,
  verification_notes JSONB,
  
  -- Document metadata
  document_date DATE,
  sender_name TEXT,
  receiver_name TEXT,
  total_weight NUMERIC,
  total_cost NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_azure_blob_path ON documents(azure_blob_path);

-- Create trigger for documents
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for documents
DROP POLICY IF EXISTS "Allow all operations on documents" ON documents;
CREATE POLICY "Allow all operations on documents" ON documents
  FOR ALL USING (true);

-- ============================================================
-- 4. USER API KEYS TABLE (for AI providers)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL DEFAULT 'default',
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT, -- Last 4 chars for display: "...abc1"
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for user_api_keys
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- Create trigger for user_api_keys
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
BEFORE UPDATE ON user_api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy for user_api_keys
DROP POLICY IF EXISTS "Allow all operations on user_api_keys" ON user_api_keys;
CREATE POLICY "Allow all operations on user_api_keys" ON user_api_keys
  FOR ALL USING (true);

-- ============================================================
-- 5. AZURE CONNECTIONS TABLE (for customer Azure storage)
-- ============================================================

CREATE TABLE IF NOT EXISTS azure_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Connection details
  connection_name TEXT NOT NULL DEFAULT 'Default',
  encrypted_connection_string TEXT NOT NULL,
  connection_hint TEXT, -- For display: "DefaultEndpointsProtocol=...;AccountName=xxx..."
  
  -- Default container configuration
  default_container TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each user can have multiple connections, but only one can be active
  UNIQUE(user_id, connection_name)
);

-- Indexes for azure_connections
CREATE INDEX IF NOT EXISTS idx_azure_connections_user_id ON azure_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_azure_connections_is_active ON azure_connections(is_active);

-- Create trigger for azure_connections
DROP TRIGGER IF EXISTS update_azure_connections_updated_at ON azure_connections;
CREATE TRIGGER update_azure_connections_updated_at
BEFORE UPDATE ON azure_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE azure_connections ENABLE ROW LEVEL SECURITY;

-- Policy for azure_connections
DROP POLICY IF EXISTS "Allow all operations on azure_connections" ON azure_connections;
CREATE POLICY "Allow all operations on azure_connections" ON azure_connections
  FOR ALL USING (true);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE settings IS 'Application settings including AI config, material synonyms, and tenant branding';
COMMENT ON TABLE documents IS 'Uploaded documents with extracted data and processing status';
COMMENT ON TABLE user_api_keys IS 'Encrypted API keys for AI providers (Google, OpenAI, Anthropic)';
COMMENT ON TABLE azure_connections IS 'Encrypted Azure Blob Storage connection strings for customer storage';

COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN azure_connections.encrypted_connection_string IS 'AES-256-GCM encrypted Azure connection string';
COMMENT ON COLUMN settings.preferred_model IS 'Preferred AI model (e.g., gemini-3-flash, gpt-5.2-chat, claude-sonnet-4.5)';
