-- ============================================================
-- SOLVIX.AI - ADD MISTRAL AS AI PROVIDER
-- ============================================================

-- Drop the existing CHECK constraint and recreate with mistral
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_check 
  CHECK (provider IN ('anthropic', 'google', 'openai', 'mistral'));
