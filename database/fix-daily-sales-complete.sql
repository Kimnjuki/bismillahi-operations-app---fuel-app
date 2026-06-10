-- =============================================================
-- COMPLETE FIX: daily_sales table creation + RLS + data access
-- This script:
--   1. Creates the daily_sales table if it doesn't exist
--   2. Disables RLS (app uses PIN auth, not Supabase Auth)
--   3. Drops restrictive policies
--   4. Creates open policies
--   5. Grants full access to anon role
--   6. Seeds sample data
-- =============================================================

-- =============================================================
-- PART 1: Create the daily_sales table (if it doesn't exist)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_type VARCHAR(20) NOT NULL,           -- 'pump' or 'drum'
  fuel_type VARCHAR(50) NOT NULL,           -- 'PMS' or 'AGO'
  station_name VARCHAR(255),                -- station identifier
  pump_number INTEGER,                      -- pump number (for pump sales)
  volume_liters DECIMAL(12,2),              -- liters sold (for pump sales)
  quantity INTEGER,                         -- number of drums (for drum sales)
  price_per_liter DECIMAL(12,2),            -- price per liter (for pump sales)
  price_per_drum DECIMAL(12,2),             -- price per drum (for drum sales)
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,  -- total sale amount
  payment_method VARCHAR(50) DEFAULT 'cash',      -- payment method
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,   -- date of sale
  created_by UUID,                          -- user who created the sale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add station_name column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_sales' 
    AND column_name = 'station_name'
  ) THEN
    ALTER TABLE public.daily_sales ADD COLUMN station_name VARCHAR(255);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_fuel_type ON public.daily_sales(fuel_type);
CREATE INDEX IF NOT EXISTS idx_daily_sales_station ON public.daily_sales(station_name);
CREATE INDEX IF NOT EXISTS idx_daily_sales_created_by ON public.daily_sales(created_by);

-- =============================================================
-- PART 2: Disable RLS on daily_sales (PIN-based auth, not Supabase Auth)
-- =============================================================
ALTER TABLE public.daily_sales DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on ALL other tables used by the app
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.station_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_payables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fund_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.internal_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pump_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drum_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_variances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transporters DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trucks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tax_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.truck_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tanks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dipping_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creditors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pumps DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- PART 3: Drop ALL existing RLS policies on daily_sales (cleanup)
-- =============================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'daily_sales'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop restrictive policies on ALL tables (cleanup)
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
-- PART 4: Create open policies for daily_sales (belt and suspenders)
-- =============================================================
CREATE POLICY open_all_daily_sales ON public.daily_sales FOR ALL USING (true) WITH CHECK (true);

-- Create open policies for ALL other tables
CREATE POLICY open_all_users ON public.users FOR ALL USING (true) WITH CHECK (true);
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('daily_sales', 'users')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS open_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY open_all_%I ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- =============================================================
-- PART 5: Grant full access to anon role (for unauthenticated API access)
-- =============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Also grant to authenticated role (in case any auth is used)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

-- =============================================================
-- PART 6: Seed sample daily_sales data for testing
-- =============================================================
INSERT INTO public.daily_sales (sale_type, fuel_type, station_name, pump_number, volume_liters, quantity, price_per_liter, price_per_drum, total_amount, payment_method, sale_date, created_by)
VALUES
  -- Today's pump sales
  ('pump', 'PMS', 'ISSIRO STATION', 1, 500.00, NULL, 3200.00, NULL, 1600000.00, 'cash', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'PMS', 'ISSIRO STATION', 2, 350.50, NULL, 3200.00, NULL, 1121600.00, 'cash', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'AGO', 'ISSIRO STATION', 3, 420.75, NULL, 3500.00, NULL, 1472625.00, 'card', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'PMS', 'DEPOT ISSIRO', 1, 600.00, NULL, 3200.00, NULL, 1920000.00, 'cash', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'AGO', 'DEPOT ISSIRO', 2, 280.00, NULL, 3500.00, NULL, 980000.00, 'cash', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  -- Today's drum sales
  ('drum', 'AGO', 'DEPOT ISSIRO', NULL, NULL, 5, NULL, 656000.00, 3280000.00, 'credit', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  ('drum', 'PMS', 'DUNGU STATION', NULL, NULL, 3, NULL, 640000.00, 1920000.00, 'cash', CURRENT_DATE, '00000000-0000-0000-0000-000000000003'),
  -- Yesterday's sales
  ('pump', 'PMS', 'ISSIRO STATION', 1, 480.00, NULL, 3200.00, NULL, 1536000.00, 'cash', CURRENT_DATE - 1, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'AGO', 'ISSIRO STATION', 3, 390.25, NULL, 3500.00, NULL, 1365875.00, 'cash', CURRENT_DATE - 1, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'PMS', 'RUNGU STATION', 1, 520.00, NULL, 3200.00, NULL, 1664000.00, 'card', CURRENT_DATE - 1, '00000000-0000-0000-0000-000000000003'),
  ('drum', 'AGO', 'DEPOT ISSIRO', NULL, NULL, 8, NULL, 656000.00, 5248000.00, 'cash', CURRENT_DATE - 1, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'PMS', 'DUNGU STATION', 2, 310.00, NULL, 3200.00, NULL, 992000.00, 'cash', CURRENT_DATE - 1, '00000000-0000-0000-0000-000000000003'),
  -- Day before yesterday
  ('pump', 'PMS', 'ISSIRO STATION', 1, 450.00, NULL, 3200.00, NULL, 1440000.00, 'cash', CURRENT_DATE - 2, '00000000-0000-0000-0000-000000000003'),
  ('pump', 'AGO', 'NIANGARA STATION', 1, 290.00, NULL, 3500.00, NULL, 1015000.00, 'cash', CURRENT_DATE - 2, '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- =============================================================
-- PART 7: Verify the setup
-- =============================================================
SELECT 'daily_sales table created' as status, COUNT(*) as row_count FROM public.daily_sales;

NOTIFY pgrst, 'reload schema';