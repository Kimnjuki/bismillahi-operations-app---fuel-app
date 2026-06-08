-- =============================================================
-- MASTER SCHEMA FIX - ALL MISSING TABLES AND COLUMNS
-- Addresses every error from application logs
-- =============================================================

-- =============================================================
-- PART 1: CREATE MISSING TABLES
-- =============================================================

-- 1a. Create `tanks` table (referenced by tankService.ts)
CREATE TABLE IF NOT EXISTS public.tanks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tank_number INTEGER NOT NULL,
    fuel_type VARCHAR(50) DEFAULT 'PMS',
    station_id UUID REFERENCES public.stations(id),
    capacity NUMERIC(12,2) DEFAULT 0,
    current_dipping NUMERIC(12,3) DEFAULT 0,
    closing_book_stock NUMERIC(12,3) DEFAULT 0,
    variance NUMERIC(12,3) GENERATED ALWAYS AS (current_dipping - closing_book_stock) STORED,
    pumps TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Create `dipping_readings` table (referenced by tankService.ts)
CREATE TABLE IF NOT EXISTS public.dipping_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tank_id UUID REFERENCES public.tanks(id),
    reading_date DATE NOT NULL,
    dipping_reading NUMERIC(12,3) NOT NULL,
    book_stock NUMERIC(12,3) NOT NULL,
    variance NUMERIC(12,3) NOT NULL,
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. Create `account_transactions` table (referenced by accountService.ts)
CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    transaction_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    reference_number VARCHAR(100),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- PART 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================

-- 2a. security_events: Add description, severity, metadata columns
ALTER TABLE IF EXISTS public.security_events 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'LOW',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2b. daily_sales: Add created_by and updated_at columns
ALTER TABLE IF EXISTS public.daily_sales 
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2c. transporters: Add missing columns
ALTER TABLE IF EXISTS public.transporters 
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS transporter_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by UUID;

-- Set defaults for existing transporter rows
UPDATE public.transporters 
SET transporter_code = 'TRP-' || SUBSTRING(id::text, 1, 8)
WHERE transporter_code IS NULL;
UPDATE public.transporters 
SET contact_person = name 
WHERE contact_person IS NULL AND name IS NOT NULL;

-- 2d. fuel_deliveries: Add missing columns
ALTER TABLE IF EXISTS public.fuel_deliveries 
    ADD COLUMN IF NOT EXISTS quantity_liters NUMERIC(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
    ADD COLUMN IF NOT EXISTS isse_vurra_cdf NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isse_vurra_usd NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS truck_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2e. fuel_stock: Add missing columns
ALTER TABLE IF EXISTS public.fuel_stock 
    ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
    ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS capacity NUMERIC(12,3) DEFAULT 100000,
    ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2f. exchange_rates: Add created_by UUID column
ALTER TABLE IF EXISTS public.exchange_rates 
    ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2g. fund_transfers: Add station column (referenced by fundTransferService)
ALTER TABLE IF EXISTS public.fund_transfers 
    ADD COLUMN IF NOT EXISTS station VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- =============================================================
-- PART 3: ADD UPDATED_AT TRIGGERS
-- =============================================================

-- Create the trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to new tables
DROP TRIGGER IF EXISTS handle_updated_at ON public.tanks;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tanks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.dipping_readings;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.dipping_readings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.account_transactions;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.account_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- PART 4: RLS POLICIES (allow all for now, tighten later)
-- =============================================================

-- tanks
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tanks_policy ON public.tanks;
CREATE POLICY tanks_policy ON public.tanks FOR ALL USING (true);

-- dipping_readings
ALTER TABLE public.dipping_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dipping_readings_policy ON public.dipping_readings;
CREATE POLICY dipping_readings_policy ON public.dipping_readings FOR ALL USING (true);

-- account_transactions
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS account_transactions_policy ON public.account_transactions;
CREATE POLICY account_transactions_policy ON public.account_transactions FOR ALL USING (true);

-- security_events (ensure open policies)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_events_open ON public.security_events;
CREATE POLICY security_events_open ON public.security_events FOR ALL USING (true);

-- transporters (ensure open policies)
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transporters_open ON public.transporters;
CREATE POLICY transporters_open ON public.transporters FOR ALL USING (true);

-- fuel_deliveries (ensure open policies)
ALTER TABLE public.fuel_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fuel_deliveries_open ON public.fuel_deliveries;
CREATE POLICY fuel_deliveries_open ON public.fuel_deliveries FOR ALL USING (true);

-- fuel_stock (ensure open policies)
ALTER TABLE public.fuel_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fuel_stock_open ON public.fuel_stock;
CREATE POLICY fuel_stock_open ON public.fuel_stock FOR ALL USING (true);

-- exchange_rates (ensure open policies)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exchange_rates_open ON public.exchange_rates;
CREATE POLICY exchange_rates_open ON public.exchange_rates FOR ALL USING (true);

-- daily_sales (ensure open policies)
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_sales_open ON public.daily_sales;
CREATE POLICY daily_sales_open ON public.daily_sales FOR ALL USING (true);

-- fund_transfers (ensure open policies)
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fund_transfers_open ON public.fund_transfers;
CREATE POLICY fund_transfers_open ON public.fund_transfers FOR ALL USING (true);

-- =============================================================
-- PART 5: CREATE INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_tanks_station_id ON public.tanks(station_id);
CREATE INDEX IF NOT EXISTS idx_dipping_readings_tank_id ON public.dipping_readings(tank_id);
CREATE INDEX IF NOT EXISTS idx_dipping_readings_date ON public.dipping_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON public.account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transporters_is_active ON public.transporters(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_station_id ON public.fuel_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_stock_station_id ON public.fuel_stock(station_id);

-- =============================================================
-- PART 6: CREATE exec_sql FUNCTION
-- =============================================================

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

-- =============================================================
-- PART 7: SCHEMA RELOAD
-- =============================================================

NOTIFY pgrst, 'reload schema';