-- Migration to update old model names to new NATIVE API model names
-- Run this to fix "Unknown model" errors
-- Updated: February 2026 - Using native provider API model names

-- Update all instances of old Gemini model names to new native API names
UPDATE settings
SET preferred_model = 'gemini-3-flash'
WHERE preferred_model IN ('gemini-2.0-flash', 'google/gemini-3-flash-preview', 'google/gemini-3-flash');

UPDATE settings
SET preferred_model = 'gemini-3-pro'
WHERE preferred_model IN ('gemini-2.0-pro', 'google/gemini-3-pro-preview', 'google/gemini-3-pro');

-- Update old Claude model names to new native API names
UPDATE settings
SET preferred_model = 'claude-haiku-4.5'
WHERE preferred_model IN ('claude-haiku-4-5-20251001', 'claude-3-haiku', 'claude-haiku-3-5', 'anthropic/claude-haiku-4.5', 'anthropic/claude-haiku-4-5');

UPDATE settings
SET preferred_model = 'claude-sonnet-4.5'
WHERE preferred_model IN ('claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-3-sonnet', 'claude-sonnet-3-5', 'anthropic/claude-sonnet-4.5', 'anthropic/claude-sonnet-4-5');

UPDATE settings
SET preferred_model = 'claude-opus-4.5'
WHERE preferred_model IN ('claude-opus-3-5', 'claude-3-opus', 'anthropic/claude-opus-4.5', 'anthropic/claude-opus-4-5');

-- Update old OpenAI model names
UPDATE settings
SET preferred_model = 'gpt-5.2'
WHERE preferred_model IN ('gpt-4o', 'gpt-4-turbo', 'openai/gpt-5.2', 'openai/gpt-5.2-chat');

-- Update old Mistral model names
UPDATE settings
SET preferred_model = 'pixtral-large'
WHERE preferred_model IN ('mistral-ocr-latest', 'mistral-large-latest', 'pixtral-large-latest', 'mistral-large-3', 'mistralai/mistral-large');

UPDATE settings
SET preferred_model = 'mistral-small'
WHERE preferred_model = 'mistral-small-latest';

-- Log the changes
SELECT 
  COUNT(*) as updated_count,
  preferred_model as new_model_name
FROM settings
WHERE preferred_model IN ('gemini-3-flash', 'gemini-3-pro', 'claude-haiku-4.5', 'claude-sonnet-4.5', 'claude-opus-4.5', 'gpt-5.2', 'pixtral-large', 'mistral-small')
GROUP BY preferred_model;
