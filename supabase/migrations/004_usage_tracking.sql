-- ============================================================
-- SOLVIX.AI - USAGE TRACKING TABLE
-- Tracks AI usage and costs for billing/display
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- What was used
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- Costs (in SEK)
  cost_sek NUMERIC(10, 4) NOT NULL DEFAULT 0,
  
  -- Processing info
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_model ON usage_tracking(model_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON usage_tracking(created_at);

-- Index for monthly aggregation
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(
  user_id, 
  date_trunc('month', created_at)
);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own usage" ON usage_tracking
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own usage records" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Service role can do everything (needed for background jobs)
-- No explicit policy needed - service role bypasses RLS

-- ============================================================
-- HELPER VIEW: Monthly usage summary
-- ============================================================

CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT 
  user_id,
  date_trunc('month', created_at) AS month,
  COUNT(*) AS total_extractions,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  ROUND(SUM(cost_sek)::numeric, 2) AS total_cost_sek,
  COUNT(*) FILTER (WHERE success = true) AS successful_extractions,
  COUNT(*) FILTER (WHERE success = false) AS failed_extractions,
  AVG(processing_time_ms)::integer AS avg_processing_time_ms
FROM usage_tracking
GROUP BY user_id, date_trunc('month', created_at);

-- ============================================================
-- HELPER FUNCTION: Get current month usage for a user
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_month_usage(p_user_id TEXT)
RETURNS TABLE (
  total_extractions BIGINT,
  total_tokens BIGINT,
  total_cost_sek NUMERIC,
  successful_extractions BIGINT,
  failed_extractions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_extractions,
    COALESCE(SUM(ut.total_tokens), 0)::BIGINT AS total_tokens,
    COALESCE(ROUND(SUM(ut.cost_sek)::numeric, 2), 0) AS total_cost_sek,
    COUNT(*) FILTER (WHERE ut.success = true)::BIGINT AS successful_extractions,
    COUNT(*) FILTER (WHERE ut.success = false)::BIGINT AS failed_extractions
  FROM usage_tracking ut
  WHERE ut.user_id = p_user_id
    AND ut.created_at >= date_trunc('month', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;
