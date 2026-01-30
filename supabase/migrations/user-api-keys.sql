-- Migration: User API Keys Storage
-- Purpose: Allow users to securely store their own AI provider API keys
-- Date: 2026-01-30

-- Create user_api_keys table for storing encrypted API keys
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (adjust for auth later)
CREATE POLICY "Allow all operations on user_api_keys" ON user_api_keys
  FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_user_api_keys_updated_at
BEFORE UPDATE ON user_api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add model preferences columns to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS preferred_model TEXT DEFAULT 'gemini-3-flash';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- Update existing default row
UPDATE settings 
SET 
  preferred_model = COALESCE(preferred_model, 'gemini-3-flash')
WHERE user_id = 'default';

-- Add comments for documentation
COMMENT ON TABLE user_api_keys IS 'Stores encrypted user API keys for AI providers (Google, OpenAI, Anthropic)';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN user_api_keys.key_hint IS 'Last 4 characters of the key for user identification';
COMMENT ON COLUMN settings.preferred_model IS 'User preferred AI model for extraction (e.g., gemini-3-flash, gpt-5.2-chat, claude-sonnet-4.5)';
COMMENT ON COLUMN settings.custom_instructions IS 'Custom extraction instructions added by user';
