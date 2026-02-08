-- Migration to update old model names to new model names
-- Run this to fix "Unknown model" errors

-- Update all instances of old Gemini model names to new ones
UPDATE settings
SET preferred_model = 'gemini-3-flash'
WHERE preferred_model = 'gemini-2.0-flash';

UPDATE settings
SET preferred_model = 'gemini-3-pro'
WHERE preferred_model = 'gemini-2.0-pro';

-- Update old Claude model names to new ones
UPDATE settings
SET preferred_model = 'claude-haiku-4.5'
WHERE preferred_model IN ('claude-haiku-4-5-20251001', 'claude-3-haiku', 'claude-haiku-3-5');

UPDATE settings
SET preferred_model = 'claude-sonnet-4.5'
WHERE preferred_model IN ('claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-3-sonnet', 'claude-sonnet-3-5');

UPDATE settings
SET preferred_model = 'claude-opus-4.5'
WHERE preferred_model IN ('claude-opus-3-5', 'claude-3-opus');

-- Update old Mistral model names
UPDATE settings
SET preferred_model = 'pixtral-large'
WHERE preferred_model IN ('mistral-ocr-latest', 'mistral-large-latest', 'pixtral-large-latest');

UPDATE settings
SET preferred_model = 'mistral-small'
WHERE preferred_model = 'mistral-small-latest';

-- Log the changes
SELECT 
  COUNT(*) as updated_count,
  preferred_model as new_model_name
FROM settings
WHERE preferred_model IN ('gemini-3-flash', 'gemini-3-pro', 'claude-haiku-4.5', 'claude-sonnet-4.5', 'claude-opus-4.5', 'pixtral-large', 'mistral-small')
GROUP BY preferred_model;
