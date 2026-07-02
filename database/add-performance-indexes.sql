-- Performance Optimization: Database Indexes
-- Run this migration to add indexes for common queries
-- Expected Impact: 10-50x faster query times for filtered queries

BEGIN;

-- 1. Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_station_date ON sales(station_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_fuel_type ON sales(station_id, fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

-- 2. Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_station_date ON expenses(station_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- 3. Accounts Receivable/Payable indexes
CREATE INDEX IF NOT EXISTS idx_ar_ap_station_status ON accounts_receivable_payable(station_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_ap_type_status ON accounts_receivable_payable(type, status);
CREATE INDEX IF NOT EXISTS idx_ar_ap_due_date ON accounts_receivable_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_ap_creditor ON accounts_receivable_payable(creditor_name);

-- 4. Pump readings indexes
CREATE INDEX IF NOT EXISTS idx_pump_readings_station_date ON pump_readings(station_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_pump_readings_pump ON pump_readings(pump_id, reading_date DESC);

-- 5. Fuel delivery indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_station_status ON fuel_deliveries(station_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON fuel_deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_transporter ON fuel_deliveries(transporter_id);

-- 6. Stock movement indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_station ON stock_movements(station_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product);

-- 7. User query indexes
CREATE INDEX IF NOT EXISTS idx_users_station_role ON user_profiles(station_id, role);
CREATE INDEX IF NOT EXISTS idx_users_code ON users(user_code);

-- 8. Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 9. Fund transfer indexes
CREATE INDEX IF NOT EXISTS idx_fund_transfers_station ON fund_transfers(station_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_status ON fund_transfers(status);

-- 10. Exchange rate indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(from_currency, to_currency, effective_date DESC);

-- 11. Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(changed_at DESC);

-- 12. Station settings indexes
CREATE INDEX IF NOT EXISTS idx_station_settings_station ON station_settings(selected_station_id);

COMMIT;

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;