-- ============================================================
-- SOLVIX.AI - STRICT RLS POLICIES
-- Multi-tenant security with auth.uid() based isolation
-- ============================================================

-- ============================================================
-- 1. SETTINGS TABLE - User owns their settings
-- ============================================================

DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;

-- SELECT: Users can read their own settings
CREATE POLICY "Users can read own settings" ON settings
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'default');

-- INSERT: Users can create their own settings
CREATE POLICY "Users can create own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own settings
CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE USING (auth.uid()::text = user_id);

-- DELETE: Users can delete their own settings
CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- 2. DOCUMENTS TABLE - User owns their documents
-- ============================================================

DROP POLICY IF EXISTS "Allow all operations on documents" ON documents;

-- SELECT: Users can read their own documents
CREATE POLICY "Users can read own documents" ON documents
  FOR SELECT USING (auth.uid()::text = user_id);

-- INSERT: Users can create documents for themselves
CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own documents
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid()::text = user_id);

-- DELETE: Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- 3. USER_API_KEYS TABLE - User owns their API keys
-- ============================================================

DROP POLICY IF EXISTS "Allow all operations on user_api_keys" ON user_api_keys;

-- SELECT: Users can read their own API keys
CREATE POLICY "Users can read own api keys" ON user_api_keys
  FOR SELECT USING (auth.uid()::text = user_id);

-- INSERT: Users can create their own API keys
CREATE POLICY "Users can create own api keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own API keys
CREATE POLICY "Users can update own api keys" ON user_api_keys
  FOR UPDATE USING (auth.uid()::text = user_id);

-- DELETE: Users can delete their own API keys
CREATE POLICY "Users can delete own api keys" ON user_api_keys
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- 4. AZURE_CONNECTIONS TABLE - User owns their connections
-- ============================================================

DROP POLICY IF EXISTS "Allow all operations on azure_connections" ON azure_connections;

-- SELECT: Users can read their own Azure connections
CREATE POLICY "Users can read own azure connections" ON azure_connections
  FOR SELECT USING (auth.uid()::text = user_id);

-- INSERT: Users can create their own Azure connections
CREATE POLICY "Users can create own azure connections" ON azure_connections
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own Azure connections
CREATE POLICY "Users can update own azure connections" ON azure_connections
  FOR UPDATE USING (auth.uid()::text = user_id);

-- DELETE: Users can delete their own Azure connections
CREATE POLICY "Users can delete own azure connections" ON azure_connections
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- 5. PROCESSING_JOBS TABLE (if exists) - User owns their jobs
-- ============================================================

-- Check if table exists before applying policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processing_jobs') THEN
    -- Enable RLS
    ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow all operations on processing_jobs" ON processing_jobs;
    
    -- Create new policies based on document ownership
    CREATE POLICY "Users can read own processing jobs" ON processing_jobs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.id = processing_jobs.document_id 
          AND documents.user_id = auth.uid()::text
        )
      );
      
    CREATE POLICY "Users can manage own processing jobs" ON processing_jobs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.id = processing_jobs.document_id 
          AND documents.user_id = auth.uid()::text
        )
      );
  END IF;
END $$;

-- ============================================================
-- 6. SCHEMA FIXES - Make user_id NOT NULL where needed
-- ============================================================

-- Documents: Ensure user_id is NOT NULL
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- Set default to auth.uid() for new rows
-- Note: This requires the user to be authenticated when inserting
-- If using service role, you must explicitly set user_id

-- ============================================================
-- 7. SERVICE ROLE BYPASS
-- Note: Service Role (admin) bypasses RLS by default
-- This is needed for cron jobs and background processing
-- ============================================================

-- No action needed - Service Role automatically bypasses RLS
-- Regular users (anon key) are subject to RLS policies
