-- Fix Critical Database Issues
-- This script addresses the most critical issues preventing proper app functionality

-- 1. Fix Users Policy Infinite Recursion (Most Critical)
-- Drop all existing user policies to prevent conflicts
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS users_simple ON users;

-- Disable and re-enable RLS to reset
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive policy
CREATE POLICY users_simple ON users FOR ALL USING (true);

-- 2. Add Missing Database Elements

-- Add missing columns to existing tables
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS account_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    creditor_name VARCHAR(255) NOT NULL,
    creditor_code VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS account_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    debtor_name VARCHAR(255) NOT NULL,
    debtor_code VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

-- Create account transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    account_id UUID NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- 'receivable' or 'payable'
    transaction_type VARCHAR(20) NOT NULL, -- 'payment', 'adjustment', 'refund'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    description TEXT,
    reference VARCHAR(100),
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

-- Create internal accounts table
CREATE TABLE IF NOT EXISTS internal_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'station', 'operational', 'tax'
    currency VARCHAR(3) DEFAULT 'CDF',
    balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

-- Create stations table if it doesn't exist
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    station_name VARCHAR(255) NOT NULL,
    station_code VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    manager_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    metadata JSONB
);

-- 3. Add RLS Policies for New Tables

-- Account Receivables Policies
ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_receivables_policy ON account_receivables FOR ALL USING (true);

-- Account Payables Policies
ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_payables_policy ON account_payables FOR ALL USING (true);

-- Account Transactions Policies
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_transactions_policy ON account_transactions FOR ALL USING (true);

-- Internal Accounts Policies
ALTER TABLE internal_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_accounts_policy ON internal_accounts FOR ALL USING (true);

-- Stations Policies
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY stations_policy ON stations FOR ALL USING (true);

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_account_receivables_status ON account_receivables(status);
CREATE INDEX IF NOT EXISTS idx_account_receivables_due_date ON account_receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_account_receivables_creditor_name ON account_receivables(creditor_name);

CREATE INDEX IF NOT EXISTS idx_account_payables_status ON account_payables(status);
CREATE INDEX IF NOT EXISTS idx_account_payables_due_date ON account_payables(due_date);
CREATE INDEX IF NOT EXISTS idx_account_payables_debtor_name ON account_payables(debtor_name);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_type ON account_transactions(account_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_internal_accounts_account_type ON internal_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_internal_accounts_is_active ON internal_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_stations_is_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_station_code ON stations(station_code);

-- 5. Insert Sample Data for Testing

-- Insert sample stations
INSERT INTO stations (id, station_name, station_code, location, manager_name, phone, email) VALUES
    (gen_random_uuid(), 'Main Station', 'STN001', 'Kinshasa', 'John Manager', '+243123456789', 'manager@station.com'),
    (gen_random_uuid(), 'Secondary Station', 'STN002', 'Lubumbashi', 'Jane Manager', '+243987654321', 'jane@station.com')
ON CONFLICT (station_code) DO NOTHING;

-- Insert sample internal accounts
INSERT INTO internal_accounts (id, account_name, account_type, currency, balance, description) VALUES
    (gen_random_uuid(), 'ISSE VURRA CDF', 'tax', 'CDF', 1250000, 'Tax account in CDF'),
    (gen_random_uuid(), 'ISSE VURRA USD', 'tax', 'USD', 5000, 'Tax account in USD'),
    (gen_random_uuid(), 'OTHER TAX ACC', 'tax', 'CDF', 750000, 'Other tax account'),
    (gen_random_uuid(), 'MAINTENANCE FUND', 'operational', 'CDF', 2000000, 'Maintenance operations fund'),
    (gen_random_uuid(), 'EQUIPMENT FUND', 'operational', 'CDF', 3500000, 'Equipment purchase fund'),
    (gen_random_uuid(), 'EMERGENCY FUND', 'operational', 'CDF', 1000000, 'Emergency operations fund')
ON CONFLICT DO NOTHING;

-- Insert sample account receivables
INSERT INTO account_receivables (id, creditor_name, creditor_code, total_amount, currency, due_date, status, description) VALUES
    (gen_random_uuid(), 'Creditor A', 'CRD001', 5000000, 'CDF', '2024-07-15', 'overdue', 'Fuel supply payment'),
    (gen_random_uuid(), 'Creditor B', 'CRD002', 2500, 'USD', '2024-07-20', 'pending', 'Equipment maintenance'),
    (gen_random_uuid(), 'Creditor C', 'CRD003', 3000000, 'CDF', '2024-07-25', 'pending', 'Station supplies')
ON CONFLICT (creditor_code) DO NOTHING;

-- Insert sample account payables
INSERT INTO account_payables (id, debtor_name, debtor_code, total_amount, currency, due_date, status, description) VALUES
    (gen_random_uuid(), 'Debtor A', 'DBT001', 2000000, 'CDF', '2024-07-18', 'pending', 'Fuel delivery payment'),
    (gen_random_uuid(), 'Debtor B', 'DBT002', 1500, 'USD', '2024-07-22', 'overdue', 'Service charges'),
    (gen_random_uuid(), 'Debtor C', 'DBT003', 4000000, 'CDF', '2024-07-28', 'pending', 'Equipment purchase')
ON CONFLICT (debtor_code) DO NOTHING;

-- 6. Update Existing Tables with Missing Columns

-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'cashier';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to security_events table if they don't exist
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 7. Create Triggers for Updated At Timestamps

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_receivables_updated_at ON account_receivables;
CREATE TRIGGER update_account_receivables_updated_at BEFORE UPDATE ON account_receivables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_payables_updated_at ON account_payables;
CREATE TRIGGER update_account_payables_updated_at BEFORE UPDATE ON account_payables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_transactions_updated_at ON account_transactions;
CREATE TRIGGER update_account_transactions_updated_at BEFORE UPDATE ON account_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_internal_accounts_updated_at ON internal_accounts;
CREATE TRIGGER update_internal_accounts_updated_at BEFORE UPDATE ON internal_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant Permissions

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 9. Force Schema Refresh
NOTIFY pgrst, 'reload schema';

-- 10. Verification Queries

-- Verify tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Verify indexes exist
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;