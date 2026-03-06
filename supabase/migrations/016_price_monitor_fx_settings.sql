ALTER TABLE price_monitor_settings
  ADD COLUMN IF NOT EXISTS exchange_rates JSONB NOT NULL DEFAULT '{"SEK":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_exchange_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exchange_rates_source TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rates_updated_at TIMESTAMPTZ;
