-- ============================================================
-- SOLVIX.AI - EXPORT TEMPLATES
-- Customizable export formats for different use cases
-- ============================================================

CREATE TABLE IF NOT EXISTS export_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Column configuration
  -- Format: [{"field": "date", "label": "Datum", "visible": true, "order": 1}, ...]
  columns JSONB NOT NULL DEFAULT '[]',
  
  -- Output format
  format TEXT NOT NULL DEFAULT 'xlsx', -- xlsx, csv, json
  
  -- Options
  include_headers BOOLEAN DEFAULT true,
  include_totals BOOLEAN DEFAULT true,
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  number_format TEXT DEFAULT 'swedish', -- swedish (comma decimal) or international (dot decimal)
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_export_templates_user_id ON export_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_is_default ON export_templates(is_default);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_export_templates_updated_at ON export_templates;
CREATE TRIGGER update_export_templates_updated_at
BEFORE UPDATE ON export_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own templates" ON export_templates
  FOR SELECT USING (auth.uid()::text = user_id OR is_system = true);

CREATE POLICY "Users can create own templates" ON export_templates
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own templates" ON export_templates
  FOR UPDATE USING (auth.uid()::text = user_id AND is_system = false);

CREATE POLICY "Users can delete own templates" ON export_templates
  FOR DELETE USING (auth.uid()::text = user_id AND is_system = false);

-- Insert default system template (Simplitics format)
INSERT INTO export_templates (user_id, name, description, columns, format, is_default, is_system) VALUES (
  'system',
  'Simplitics Standard',
  'Standard exportformat kompatibelt med Simplitics',
  '[
    {"field": "date", "label": "Utförtdatum", "visible": true, "order": 1},
    {"field": "address", "label": "Hämtställe", "visible": true, "order": 2},
    {"field": "material", "label": "Material", "visible": true, "order": 3},
    {"field": "weightKg", "label": "Kvantitet", "visible": true, "order": 4},
    {"field": "unit", "label": "Enhet", "visible": true, "order": 5},
    {"field": "receiver", "label": "Leveransställe", "visible": true, "order": 6},
    {"field": "isHazardous", "label": "Farligt avfall", "visible": true, "order": 7},
    {"field": "handling", "label": "Behandling", "visible": true, "order": 8}
  ]'::jsonb,
  'xlsx',
  true,
  true
) ON CONFLICT DO NOTHING;
