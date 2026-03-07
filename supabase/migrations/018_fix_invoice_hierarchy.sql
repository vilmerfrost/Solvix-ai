-- ============================================================
-- Fix invoice line item hierarchy + product price accuracy
-- Problem: every line item becomes its own product with its own
-- micro-amount price. The "primary" item (highest positive amount
-- per document) should represent the invoice, and the product's
-- tracked price should match the document's total_cost (already
-- FX-converted to SEK by the edge function).
-- ============================================================

-- 1. Ensure is_primary / is_detail columns exist
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_detail  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_trackable BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill: mark the single line item with the highest positive
--    amount per (document_id, user_id) as is_primary = true.
--    All other rows for that document become is_detail = true.
WITH primary_rows AS (
  SELECT DISTINCT ON (document_id, user_id)
    id
  FROM invoice_line_items
  WHERE amount IS NOT NULL AND amount > 0
  ORDER BY document_id, user_id, amount DESC
)
UPDATE invoice_line_items li
SET
  is_primary = (li.id IN (SELECT id FROM primary_rows)),
  is_detail  = (li.id NOT IN (SELECT id FROM primary_rows));

-- 3. Mark products whose ALL line items have amount <= 0 as non-trackable.
UPDATE products p
SET is_trackable = false
WHERE EXISTS (
  SELECT 1 FROM invoice_line_items li
  WHERE li.product_id = p.id
  HAVING COUNT(*) > 0
     AND SUM(CASE WHEN li.amount > 0 THEN 1 ELSE 0 END) = 0
);

-- 4. Fix the v_product_overview view to use document.total_cost
--    as the price for products whose line items are primary rows
--    on that document — this gives the real FX-converted invoice total.
DROP VIEW IF EXISTS v_product_overview;

CREATE VIEW v_product_overview AS
WITH ranked AS (
  SELECT
    li.user_id,
    li.product_id,
    li.document_id,
    -- Use document total_cost when available (already in SEK), else fall back to line item amount
    COALESCE(d.total_cost, li.amount) AS effective_price,
    COALESCE(d.document_date, li.invoice_date) AS effective_date,
    li.is_primary,
    ROW_NUMBER() OVER (
      PARTITION BY li.user_id, li.product_id
      ORDER BY COALESCE(d.document_date, li.invoice_date) DESC NULLS LAST
    ) AS rn
  FROM invoice_line_items li
  LEFT JOIN documents d ON d.id = li.document_id AND d.user_id = li.user_id
  WHERE li.is_primary = true
),
latest AS (
  SELECT * FROM ranked WHERE rn = 1
),
prev AS (
  SELECT * FROM ranked WHERE rn = 2
),
inv_count AS (
  SELECT user_id, product_id, COUNT(DISTINCT document_id) AS invoice_count
  FROM invoice_line_items
  WHERE is_primary = true
  GROUP BY user_id, product_id
)
SELECT
  p.user_id,
  p.id                               AS product_id,
  p.name                             AS product_name,
  p.unit,
  s.id                               AS supplier_id,
  s.name                             AS supplier_name,
  p.is_trackable,
  l.effective_price                  AS latest_price,
  l.effective_date                   AS latest_date,
  pr.effective_price                 AS previous_price,
  pr.effective_date                  AS previous_date,
  CASE
    WHEN pr.effective_price IS NOT NULL AND pr.effective_price > 0
    THEN ROUND(((l.effective_price - pr.effective_price) / pr.effective_price * 100)::numeric, 1)
    ELSE NULL
  END                                AS change_percent,
  COALESCE(ic.invoice_count, 0)      AS invoice_count
FROM products p
JOIN suppliers s ON s.id = p.supplier_id AND s.user_id = p.user_id
LEFT JOIN latest l  ON l.product_id  = p.id AND l.user_id  = p.user_id
LEFT JOIN prev   pr ON pr.product_id = p.id AND pr.user_id = p.user_id
LEFT JOIN inv_count ic ON ic.product_id = p.id AND ic.user_id = p.user_id
WHERE p.is_trackable = true;

-- 5. Trigger: when new line items are inserted for a document,
--    promote the highest-amount row to is_primary and demote the rest.
CREATE OR REPLACE FUNCTION fn_tag_primary_line_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_primary_id UUID;
BEGIN
  -- Find the highest positive-amount row for this document
  SELECT id INTO v_primary_id
  FROM invoice_line_items
  WHERE document_id = NEW.document_id
    AND user_id     = NEW.user_id
    AND amount IS NOT NULL
    AND amount > 0
  ORDER BY amount DESC
  LIMIT 1;

  -- Reset all rows for this document
  UPDATE invoice_line_items
  SET is_primary = false,
      is_detail  = true
  WHERE document_id = NEW.document_id
    AND user_id     = NEW.user_id;

  -- Mark the winner
  IF v_primary_id IS NOT NULL THEN
    UPDATE invoice_line_items
    SET is_primary = true,
        is_detail  = false
    WHERE id = v_primary_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tag_primary_line_item ON invoice_line_items;
CREATE TRIGGER trg_tag_primary_line_item
AFTER INSERT ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION fn_tag_primary_line_item();
