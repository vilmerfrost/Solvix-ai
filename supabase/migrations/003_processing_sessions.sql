-- ============================================================
-- SOLVIX.AI - PROCESSING SESSIONS TABLE
-- Enables circuit breaker functionality (stop extraction)
-- ============================================================

CREATE TABLE IF NOT EXISTS processing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- Session status: 'active', 'completed', 'cancelled'
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Document IDs being processed in this session
  document_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Progress tracking
  total_documents INTEGER NOT NULL DEFAULT 0,
  processed_documents INTEGER NOT NULL DEFAULT 0,
  failed_documents INTEGER NOT NULL DEFAULT 0,
  
  -- Model used
  model_id TEXT,
  custom_instructions TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON processing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_status ON processing_sessions(user_id, status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_processing_sessions_updated_at ON processing_sessions;
CREATE TRIGGER update_processing_sessions_updated_at
BEFORE UPDATE ON processing_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own processing sessions" ON processing_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own processing sessions" ON processing_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own processing sessions" ON processing_sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own processing sessions" ON processing_sessions
  FOR DELETE USING (auth.uid()::text = user_id);
