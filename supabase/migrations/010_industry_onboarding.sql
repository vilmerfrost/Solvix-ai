-- ============================================================
-- SOLVIX.AI - INDUSTRY ONBOARDING
-- Adds industry selection and feature flags to settings
-- ============================================================

-- Add industry column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'general';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Add industry-specific feature flags
ALTER TABLE settings ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{
  "azure_integration": false,
  "material_synonyms": false,
  "waste_codes": false,
  "simplitics_export": false,
  "batch_processing": true,
  "excel_export": true,
  "api_access": false
}'::jsonb;

-- Create an index for industry lookups
CREATE INDEX IF NOT EXISTS idx_settings_industry ON settings(industry);

-- Add comments
COMMENT ON COLUMN settings.industry IS 'User industry: office, logistics, waste, construction, finance, other';
COMMENT ON COLUMN settings.features_enabled IS 'JSON object of enabled features based on industry and plan';

-- Mark existing users as onboarded (waste management by default)
UPDATE settings
SET onboarding_complete = true,
    industry = 'waste',
    features_enabled = '{
      "azure_integration": true,
      "material_synonyms": true,
      "waste_codes": true,
      "simplitics_export": true,
      "batch_processing": true,
      "excel_export": true,
      "api_access": false
    }'::jsonb
WHERE onboarding_complete IS NULL OR onboarding_complete = false;
