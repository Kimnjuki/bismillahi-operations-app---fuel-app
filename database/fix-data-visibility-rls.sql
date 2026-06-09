-- =============================================================
-- FIX: Data Not Visible After Insertion
-- Issue: The app uses PIN-based authentication (NOT Supabase Auth),
-- so auth.uid() is NEVER set. RLS policies that check auth.uid()
-- block ALL data reads/writes for these users.
-- =============================================================

-- =============================================================
-- PART 1: Disable RLS on ALL tables (since we use custom PIN auth)
-- This is the cleanest solution for a custom auth system
-- =============================================================

-- Disable RLS on all tables used by the app
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_payables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_variances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transporters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipping_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pumps DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- PART 2: Drop all existing RLS policies (cleanup)
-- =============================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- =============================================================
-- PART 3: Create open policies for any tables where RLS might 
-- be re-enabled in the future (belt and suspenders)
-- =============================================================
CREATE POLICY open_all ON public.users FOR ALL USING (true);
CREATE POLICY open_all ON public.stations FOR ALL USING (true);
CREATE POLICY open_all ON public.station_settings FOR ALL USING (true);
CREATE POLICY open_all ON public.account_receivables FOR ALL USING (true);
CREATE POLICY open_all ON public.account_payables FOR ALL USING (true);
CREATE POLICY open_all ON public.account_transactions FOR ALL USING (true);
CREATE POLICY open_all ON public.expenses FOR ALL USING (true);
CREATE POLICY open_all ON public.expense_categories FOR ALL USING (true);
CREATE POLICY open_all ON public.fund_transfers FOR ALL USING (true);
CREATE POLICY open_all ON public.exchange_rates FOR ALL USING (true);
CREATE POLICY open_all ON public.notifications FOR ALL USING (true);
CREATE POLICY open_all ON public.internal_accounts FOR ALL USING (true);
CREATE POLICY open_all ON public.pump_sales FOR ALL USING (true);
CREATE POLICY open_all ON public.drum_sales FOR ALL USING (true);
CREATE POLICY open_all ON public.stock_items FOR ALL USING (true);
CREATE POLICY open_all ON public.stock_variances FOR ALL USING (true);
CREATE POLICY open_all ON public.fuel_deliveries FOR ALL USING (true);
CREATE POLICY open_all ON public.fuel_stock FOR ALL USING (true);
CREATE POLICY open_all ON public.transporters FOR ALL USING (true);
CREATE POLICY open_all ON public.trucks FOR ALL USING (true);
CREATE POLICY open_all ON public.tax_payments FOR ALL USING (true);
CREATE POLICY open_all ON public.truck_transactions FOR ALL USING (true);
CREATE POLICY open_all ON public.tanks FOR ALL USING (true);
CREATE POLICY open_all ON public.dipping_readings FOR ALL USING (true);
CREATE POLICY open_all ON public.daily_sales FOR ALL USING (true);
CREATE POLICY open_all ON public.security_events FOR ALL USING (true);
CREATE POLICY open_all ON public.creditors FOR ALL USING (true);
CREATE POLICY open_all ON public.suppliers FOR ALL USING (true);
CREATE POLICY open_all ON public.pumps FOR ALL USING (true);

-- =============================================================
-- PART 4: Verify demo users exist in the database
-- (so queries with user_id filters can find them)
-- =============================================================
INSERT INTO public.users (id, user_code, full_name, role, is_active, pin_hash, created_at, updated_at) VALUES
    ('demo-1', 'A001', 'Admin User', 'admin', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
    ('demo-2', 'A002', 'Manager User', 'manager', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
    ('demo-3', 'A003', 'Cashier User', 'cashier', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
    ('demo-4', 'A004', 'Viewer User', 'viewer', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    user_code = EXCLUDED.user_code,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- =============================================================
-- PART 5: Create the anon key grant for public access
-- =============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

NOTIFY pgrst, 'reload schema';