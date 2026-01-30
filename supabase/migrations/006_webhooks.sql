-- ============================================================
-- VEXTRA AI - WEBHOOKS SYSTEM
-- Enable integrations with external systems (n8n, Zapier, etc.)
-- ============================================================

-- Webhooks configuration table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- Webhook configuration
  name TEXT NOT NULL DEFAULT 'Ny webhook',
  url TEXT NOT NULL,
  secret TEXT, -- HMAC secret for signature verification
  
  -- Events to trigger
  events TEXT[] NOT NULL DEFAULT '{}',
  -- Available events:
  -- 'document.uploaded' - When document is uploaded
  -- 'document.processed' - When document processing completes
  -- 'document.approved' - When document is approved
  -- 'document.rejected' - When document is rejected
  -- 'document.failed' - When document processing fails
  -- 'export.complete' - When export to Azure completes
  -- 'batch.complete' - When batch processing completes
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Statistics
  total_sent INTEGER DEFAULT 0,
  total_success INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status INTEGER, -- HTTP status code of last attempt
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Event details
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  attempts INTEGER DEFAULT 0,
  
  -- Response details
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Trigger for updated_at on webhooks
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can manage their own webhooks
CREATE POLICY "Users can read own webhooks" ON webhooks
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own webhooks" ON webhooks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own webhooks" ON webhooks
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own webhooks" ON webhooks
  FOR DELETE USING (auth.uid()::text = user_id);

-- Users can only read logs for their own webhooks
CREATE POLICY "Users can read own webhook logs" ON webhook_logs
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.uid()::text)
  );

-- Service role can insert logs (for webhook dispatcher)
-- Note: Service role bypasses RLS by default
