-- =============================================================
-- COMPLETE SCHEMA FIX
-- Adds ALL missing columns needed by the app code
-- =============================================================

-- 1. FIX users table - add pin_hash and station_id
ALTER TABLE IF EXISTS public.users 
    ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS push_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS station_id UUID;

-- 2. FIX stations table - ensure all columns exist
ALTER TABLE IF EXISTS public.stations 
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS station_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS station_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS system_type VARCHAR(50) DEFAULT 'pump',
    ADD COLUMN IF NOT EXISTS usd_support BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS capacity_liters NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.stations SET name = station_name WHERE name IS NULL AND station_name IS NOT NULL;
UPDATE public.stations SET station_name = name WHERE station_name IS NULL AND name IS NOT NULL;

-- 3. FIX account_receivables - add missing columns
ALTER TABLE IF EXISTS public.account_receivables 
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS last_payment_date DATE,
    ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(15,2);

-- 4. FIX account_payables - add missing columns
ALTER TABLE IF EXISTS public.account_payables 
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS last_payment_date DATE,
    ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(15,2);

-- 5. FIX expenses - add missing columns
ALTER TABLE IF EXISTS public.expenses 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
    ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);

-- 6. FIX fund_transfers - add missing columns
ALTER TABLE IF EXISTS public.fund_transfers 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,4),
    ADD COLUMN IF NOT EXISTS converted_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS purpose TEXT,
    ADD COLUMN IF NOT EXISTS station VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- 7. FIX exchange_rates - add missing columns
ALTER TABLE IF EXISTS public.exchange_rates 
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 8. FIX internal_accounts - add missing columns
ALTER TABLE IF EXISTS public.internal_accounts 
    ADD COLUMN IF NOT EXISTS account_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS station_id UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9. FIX pump_sales - add missing columns
ALTER TABLE IF EXISTS public.pump_sales 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by UUID;

-- 10. FIX drum_sales - add missing columns
ALTER TABLE IF EXISTS public.drum_sales 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by UUID;

-- 11. FIX stock_items - add missing columns
ALTER TABLE IF EXISTS public.stock_items 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- 12. FIX fuel_deliveries - add missing columns
ALTER TABLE IF EXISTS public.fuel_deliveries 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 13. FIX transporters - add missing columns
ALTER TABLE IF EXISTS public.transporters 
    ADD COLUMN IF NOT EXISTS transporter_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 14. FIX security_events - add missing columns
ALTER TABLE IF EXISTS public.security_events 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'LOW',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 15. FIX daily_sales - add missing columns
ALTER TABLE IF EXISTS public.daily_sales 
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 16. FIX notifications - add missing columns
ALTER TABLE IF EXISTS public.notifications 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 17. FIX fuel_stock - add missing columns
ALTER TABLE IF EXISTS public.fuel_stock 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- 18. Re-enable RLS as disabled for custom auth
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
ALTER TABLE IF EXISTS public.tax_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.truck_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tanks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dipping_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creditors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pumps DISABLE ROW LEVEL SECURITY;

-- 19. Ensure anon has full access
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

NOTIFY pgrst, 'reload schema';