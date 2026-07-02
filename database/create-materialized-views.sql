-- Performance Optimization: Materialized Views for Dashboard & Reports
-- Run this migration after indexes are applied
-- Expected Impact: Dashboard queries 50-100ms instead of 3-5 seconds

BEGIN;

-- 1. Daily Sales Summary Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales_summary AS
SELECT 
  s.station_id,
  s.sale_date,
  s.fuel_type_id,
  ft.name AS fuel_type_name,
  COUNT(*) AS transaction_count,
  SUM(s.quantity) AS total_volume,
  SUM(s.amount) AS total_amount,
  SUM(COALESCE(s.tax_amount, 0)) AS total_tax,
  s.currency
FROM sales s
LEFT JOIN fuel_types ft ON s.fuel_type_id = ft.id
WHERE s.status = 'completed'
GROUP BY s.station_id, s.sale_date, s.fuel_type_id, ft.name, s.currency;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales_unique 
  ON mv_daily_sales_summary(station_id, sale_date, fuel_type_id, currency);

-- 2. Financial Overview Materialized View (Consolidated)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_financial_overview AS
WITH daily_sales AS (
  SELECT 
    station_id, 
    sale_date AS transaction_date, 
    'SALES' AS transaction_type, 
    amount AS amount, 
    currency
  FROM sales 
  WHERE status = 'completed'
),
daily_expenses AS (
  SELECT 
    station_id, 
    expense_date AS transaction_date, 
    'EXPENSE' AS transaction_type, 
    amount, 
    COALESCE(currency, 'CDF') AS currency
  FROM expenses 
  WHERE status = 'approved' OR status IS NULL
),
daily_ar AS (
  SELECT 
    station_id, 
    due_date AS transaction_date, 
    'AR' AS transaction_type, 
    amount, 
    currency
  FROM accounts_receivable_payable 
  WHERE type = 'receivable' AND status = 'pending'
),
daily_ap AS (
  SELECT 
    station_id, 
    due_date AS transaction_date, 
    'AP' AS transaction_type, 
    amount, 
    currency
  FROM accounts_receivable_payable 
  WHERE type = 'payable' AND status = 'pending'
)
SELECT * FROM daily_sales
UNION ALL 
SELECT * FROM daily_expenses
UNION ALL 
SELECT * FROM daily_ar
UNION ALL 
SELECT * FROM daily_ap;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financial_unique 
  ON mv_financial_overview(station_id, transaction_date, transaction_type, currency);

-- 3. Station Daily Summary (for multi-station dashboards)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_station_daily_summary AS
SELECT 
  s.id AS station_id,
  s.name AS station_name,
  s.station_code,
  CURRENT_DATE AS summary_date,
  COALESCE(sales_data.total_sales, 0) AS total_sales,
  COALESCE(sales_data.transaction_count, 0) AS transaction_count,
  COALESCE(expense_data.total_expenses, 0) AS total_expenses,
  COALESCE(ar_data.total_receivables, 0) AS total_receivables,
  COALESCE(ap_data.total_payables, 0) AS total_payables
FROM stations s
LEFT JOIN (
  SELECT station_id, SUM(amount) AS total_sales, COUNT(*) AS transaction_count
  FROM sales WHERE sale_date = CURRENT_DATE AND status = 'completed'
  GROUP BY station_id
) sales_data ON s.id = sales_data.station_id
LEFT JOIN (
  SELECT station_id, SUM(amount) AS total_expenses
  FROM expenses WHERE expense_date = CURRENT_DATE AND (status = 'approved' OR status IS NULL)
  GROUP BY station_id
) expense_data ON s.id = expense_data.station_id
LEFT JOIN (
  SELECT station_id, SUM(amount) AS total_receivables
  FROM accounts_receivable_payable WHERE type = 'receivable' AND status = 'pending'
  GROUP BY station_id
) ar_data ON s.id = ar_data.station_id
LEFT JOIN (
  SELECT station_id, SUM(amount) AS total_payables
  FROM accounts_receivable_payable WHERE type = 'payable' AND status = 'pending'
  GROUP BY station_id
) ap_data ON s.id = ap_data.station_id
WHERE s.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_station_daily_unique 
  ON mv_station_daily_summary(station_id, summary_date);

-- 4. Refresh Function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_financial_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_station_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to refresh on demand via Edge Function
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS json AS $$
BEGIN
  PERFORM refresh_materialized_views();
  RETURN json_build_object('status', 'success', 'refreshed_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Verify materialized views were created
SELECT
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;