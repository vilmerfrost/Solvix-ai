-- ============================================================
-- Long-term fix: auto-rename products to service names
-- whenever they are created or their supplier changes.
-- This runs AFTER INSERT OR UPDATE on products, so it
-- catches products created by the edge function too.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_apply_service_product_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_supplier_name TEXT;
  v_service_name  TEXT;
BEGIN
  -- Get the supplier name for this product
  SELECT name INTO v_supplier_name
  FROM suppliers
  WHERE id = NEW.supplier_id
  LIMIT 1;

  IF v_supplier_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map supplier → canonical service product name
  v_service_name := CASE
    WHEN v_supplier_name ILIKE '%anthropic%'            THEN 'Anthropic Claude'
    WHEN v_supplier_name ILIKE '%supabase%'             THEN 'Supabase Pro'
    WHEN v_supplier_name ILIKE '%vercel%'               THEN 'Vercel Pro'
    WHEN v_supplier_name ILIKE '%mistral%'              THEN 'Mistral AI'
    WHEN v_supplier_name ILIKE '%openai%'               THEN 'OpenAI'
    WHEN v_supplier_name ILIKE '%moonshot%'             THEN 'Moonshot AI'
    WHEN v_supplier_name ILIKE '%superultra%'           THEN 'SuperUltra'
    WHEN v_supplier_name ILIKE '%railway%'              THEN 'Railway'
    WHEN v_supplier_name ILIKE '%render%'               THEN 'Render'
    WHEN v_supplier_name ILIKE '%fly.io%'               THEN 'Fly.io'
    WHEN v_supplier_name ILIKE '%cloudflare%'           THEN 'Cloudflare'
    WHEN v_supplier_name ILIKE '%amazon web services%'  THEN 'AWS'
    WHEN v_supplier_name ILIKE '%aws%'                  THEN 'AWS'
    WHEN v_supplier_name ILIKE '%google cloud%'         THEN 'Google Cloud'
    WHEN v_supplier_name ILIKE '%microsoft azure%'      THEN 'Microsoft Azure'
    WHEN v_supplier_name ILIKE '%stripe%'               THEN 'Stripe'
    WHEN v_supplier_name ILIKE '%github%'               THEN 'GitHub'
    WHEN v_supplier_name ILIKE '%gitlab%'               THEN 'GitLab'
    WHEN v_supplier_name ILIKE '%linear%'               THEN 'Linear'
    WHEN v_supplier_name ILIKE '%notion%'               THEN 'Notion'
    WHEN v_supplier_name ILIKE '%slack%'                THEN 'Slack'
    WHEN v_supplier_name ILIKE '%figma%'                THEN 'Figma'
    WHEN v_supplier_name ILIKE '%datadog%'              THEN 'Datadog'
    WHEN v_supplier_name ILIKE '%sentry%'               THEN 'Sentry'
    WHEN v_supplier_name ILIKE '%twilio%'               THEN 'Twilio'
    WHEN v_supplier_name ILIKE '%sendgrid%'             THEN 'SendGrid'
    WHEN v_supplier_name ILIKE '%postmark%'             THEN 'Postmark'
    ELSE NULL
  END;

  -- Only override if we have a mapping AND the name isn't already correct
  IF v_service_name IS NOT NULL AND NEW.name <> v_service_name THEN
    NEW.name := v_service_name;
    NEW.normalized_name := LOWER(v_service_name);
  END IF;

  RETURN NEW;
END;
$$;

-- Fires BEFORE INSERT so the row is saved with the correct name immediately
DROP TRIGGER IF EXISTS trg_apply_service_product_name ON products;
CREATE TRIGGER trg_apply_service_product_name
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION fn_apply_service_product_name();

-- ============================================================
-- Backfill: fix all existing products right now
-- ============================================================
UPDATE products p
SET
  name = CASE
    WHEN s.name ILIKE '%anthropic%'            THEN 'Anthropic Claude'
    WHEN s.name ILIKE '%supabase%'             THEN 'Supabase Pro'
    WHEN s.name ILIKE '%vercel%'               THEN 'Vercel Pro'
    WHEN s.name ILIKE '%mistral%'              THEN 'Mistral AI'
    WHEN s.name ILIKE '%openai%'               THEN 'OpenAI'
    WHEN s.name ILIKE '%moonshot%'             THEN 'Moonshot AI'
    WHEN s.name ILIKE '%superultra%'           THEN 'SuperUltra'
    WHEN s.name ILIKE '%railway%'              THEN 'Railway'
    WHEN s.name ILIKE '%render%'               THEN 'Render'
    WHEN s.name ILIKE '%fly.io%'               THEN 'Fly.io'
    WHEN s.name ILIKE '%cloudflare%'           THEN 'Cloudflare'
    WHEN s.name ILIKE '%amazon web services%'  THEN 'AWS'
    WHEN s.name ILIKE '%aws%'                  THEN 'AWS'
    WHEN s.name ILIKE '%google cloud%'         THEN 'Google Cloud'
    WHEN s.name ILIKE '%microsoft azure%'      THEN 'Microsoft Azure'
    WHEN s.name ILIKE '%stripe%'               THEN 'Stripe'
    WHEN s.name ILIKE '%github%'               THEN 'GitHub'
    WHEN s.name ILIKE '%gitlab%'               THEN 'GitLab'
    WHEN s.name ILIKE '%linear%'               THEN 'Linear'
    WHEN s.name ILIKE '%notion%'               THEN 'Notion'
    WHEN s.name ILIKE '%slack%'                THEN 'Slack'
    WHEN s.name ILIKE '%figma%'                THEN 'Figma'
    WHEN s.name ILIKE '%datadog%'              THEN 'Datadog'
    WHEN s.name ILIKE '%sentry%'               THEN 'Sentry'
    WHEN s.name ILIKE '%twilio%'               THEN 'Twilio'
    WHEN s.name ILIKE '%sendgrid%'             THEN 'SendGrid'
    WHEN s.name ILIKE '%postmark%'             THEN 'Postmark'
    ELSE p.name
  END,
  normalized_name = LOWER(CASE
    WHEN s.name ILIKE '%anthropic%'            THEN 'Anthropic Claude'
    WHEN s.name ILIKE '%supabase%'             THEN 'Supabase Pro'
    WHEN s.name ILIKE '%vercel%'               THEN 'Vercel Pro'
    WHEN s.name ILIKE '%mistral%'              THEN 'Mistral AI'
    WHEN s.name ILIKE '%openai%'               THEN 'OpenAI'
    WHEN s.name ILIKE '%moonshot%'             THEN 'Moonshot AI'
    WHEN s.name ILIKE '%superultra%'           THEN 'SuperUltra'
    WHEN s.name ILIKE '%railway%'              THEN 'Railway'
    WHEN s.name ILIKE '%render%'               THEN 'Render'
    WHEN s.name ILIKE '%fly.io%'               THEN 'Fly.io'
    WHEN s.name ILIKE '%cloudflare%'           THEN 'Cloudflare'
    WHEN s.name ILIKE '%amazon web services%'  THEN 'AWS'
    WHEN s.name ILIKE '%aws%'                  THEN 'AWS'
    WHEN s.name ILIKE '%google cloud%'         THEN 'Google Cloud'
    WHEN s.name ILIKE '%microsoft azure%'      THEN 'Microsoft Azure'
    WHEN s.name ILIKE '%stripe%'               THEN 'Stripe'
    WHEN s.name ILIKE '%github%'               THEN 'GitHub'
    WHEN s.name ILIKE '%gitlab%'               THEN 'GitLab'
    WHEN s.name ILIKE '%linear%'               THEN 'Linear'
    WHEN s.name ILIKE '%notion%'               THEN 'Notion'
    WHEN s.name ILIKE '%slack%'                THEN 'Slack'
    WHEN s.name ILIKE '%figma%'                THEN 'Figma'
    WHEN s.name ILIKE '%datadog%'              THEN 'Datadog'
    WHEN s.name ILIKE '%sentry%'               THEN 'Sentry'
    WHEN s.name ILIKE '%twilio%'               THEN 'Twilio'
    WHEN s.name ILIKE '%sendgrid%'             THEN 'SendGrid'
    WHEN s.name ILIKE '%postmark%'             THEN 'Postmark'
    ELSE p.name
  END)
FROM suppliers s
WHERE p.supplier_id = s.id;

-- ============================================================
-- Merge duplicate products that now have the same name
-- per supplier (reassign line items, then delete dupes)
-- ============================================================
WITH ranked AS (
  SELECT
    p.id,
    p.supplier_id,
    LOWER(p.name) AS lname,
    COUNT(li.id)  AS line_count,
    ROW_NUMBER() OVER (
      PARTITION BY p.supplier_id, LOWER(p.name)
      ORDER BY COUNT(li.id) DESC, p.created_at ASC
    ) AS rn
  FROM products p
  LEFT JOIN invoice_line_items li ON li.product_id = p.id
  GROUP BY p.id, p.supplier_id, p.name, p.created_at
),
dupes AS (
  SELECT r.id AS dup_id, k.id AS keep_id
  FROM ranked r
  JOIN ranked k
    ON  k.supplier_id = r.supplier_id
    AND k.lname       = r.lname
    AND k.rn          = 1
  WHERE r.rn > 1
)
UPDATE invoice_line_items li
SET product_id = d.keep_id
FROM dupes d
WHERE li.product_id = d.dup_id;

DELETE FROM products p
WHERE (
  SELECT COUNT(*) FROM invoice_line_items WHERE product_id = p.id
) = 0
AND (
  SELECT COUNT(*)
  FROM products p2
  WHERE p2.supplier_id = p.supplier_id
    AND LOWER(p2.name) = LOWER(p.name)
    AND p2.id <> p.id
) > 0;
