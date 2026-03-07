-- ============================================================
-- Fix v_supplier_comparison to use document total_cost
-- instead of raw invoice_line_items.unit_price which shows
-- micro-amounts like 0.00 kr for per-token API billing.
-- ============================================================

-- Replace the comparison view with one that uses the primary
-- line item's document total_cost as the effective unit_price.
CREATE OR REPLACE VIEW v_supplier_comparison AS
WITH latest_by_product AS (
  -- For each product, get the most recent primary line item and its document total
  SELECT DISTINCT ON (li.user_id, li.product_id)
    li.user_id,
    li.product_id,
    li.supplier_id,
    li.document_id,
    COALESCE(d.total_cost, li.amount) AS unit_price,
    COALESCE(d.document_date, li.invoice_date) AS invoice_date
  FROM invoice_line_items li
  LEFT JOIN documents d ON d.id = li.document_id AND d.user_id = li.user_id
  WHERE li.is_primary = true
  ORDER BY li.user_id, li.product_id,
           COALESCE(d.document_date, li.invoice_date) DESC NULLS LAST
),
grouped AS (
  -- Join products to their group, supplier, and latest price
  SELECT
    p.user_id,
    p.id                 AS product_id,
    p.name               AS product_name,
    p.unit,
    pg.id                AS group_id,
    pg.name              AS group_name,
    s.id                 AS supplier_id,
    s.name               AS supplier_name,
    COALESCE(lb.unit_price, 0) AS unit_price,
    lb.invoice_date
  FROM products p
  JOIN suppliers s ON s.id = p.supplier_id AND s.user_id = p.user_id
  JOIN product_groups pg ON pg.id = p.group_id AND pg.user_id = p.user_id
  LEFT JOIN latest_by_product lb ON lb.product_id = p.id AND lb.user_id = p.user_id
  WHERE p.is_trackable = true
),
price_stats AS (
  SELECT
    group_id,
    user_id,
    MIN(unit_price) AS cheapest_price,
    MAX(unit_price) AS most_expensive_price,
    COUNT(DISTINCT supplier_id) AS suppliers_count
  FROM grouped
  GROUP BY group_id, user_id
)
SELECT
  g.user_id,
  g.product_id,
  g.product_name,
  g.unit,
  g.group_id,
  g.group_name,
  g.supplier_id,
  g.supplier_name,
  g.unit_price,
  g.invoice_date,
  ps.cheapest_price,
  ps.most_expensive_price,
  ps.suppliers_count,
  CASE
    WHEN ps.cheapest_price > 0
    THEN ROUND(((g.unit_price - ps.cheapest_price) / ps.cheapest_price * 100)::numeric, 1)
    ELSE 0
  END AS premium_percent
FROM grouped g
JOIN price_stats ps ON ps.group_id = g.group_id AND ps.user_id = g.user_id;
