-- Add tenant branding fields to settings table for white-label support
-- Run this migration to enable the setup wizard and tenant customization

-- Add tenant branding columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT 'Document Pipeline';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_slug TEXT DEFAULT 'document-pipeline';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'sv';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS known_receivers JSONB DEFAULT '["Ragn-Sells", "Renova", "NSR", "SITA", "Stena Recycling"]'::jsonb;

-- Update existing default row if it exists
UPDATE settings 
SET 
  company_name = COALESCE(company_name, 'Document Pipeline'),
  company_slug = COALESCE(company_slug, 'document-pipeline'),
  primary_color = COALESCE(primary_color, '#3B82F6'),
  language = COALESCE(language, 'sv'),
  is_setup_complete = COALESCE(is_setup_complete, false)
WHERE user_id = 'default';

-- Insert default row if it doesn't exist
INSERT INTO settings (user_id, company_name, company_slug, primary_color, language, is_setup_complete)
VALUES ('default', 'Document Pipeline', 'document-pipeline', '#3B82F6', 'sv', false)
ON CONFLICT (user_id) DO NOTHING;
