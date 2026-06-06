-- Complete Database Schema Fix for Supabase MCP Server

-- Fix security_events table
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Fix daily_sales table
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;

-- Fix users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'cashier';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create account tables
CREATE TABLE IF NOT EXISTS account_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    creditor_name VARCHAR(255) NOT NULL,
    creditor_code VARCHAR(100) UNIQUE,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT
);

CREATE TABLE IF NOT EXISTS account_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    debtor_name VARCHAR(255) NOT NULL,
    debtor_code VARCHAR(100) UNIQUE,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT
);

-- Fix users policy
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_simple ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_simple ON users FOR ALL USING (true);

-- Enable RLS for account tables
ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_receivables_simple ON account_receivables FOR ALL USING (true);
CREATE POLICY account_payables_simple ON account_payables FOR ALL USING (true);

-- Insert sample data
INSERT INTO account_receivables (id, creditor_name, creditor_code, total_amount, currency, due_date, status, description) VALUES
    (gen_random_uuid(), 'Creditor A', 'CRD001', 5000000, 'CDF', '2024-07-15', 'overdue', 'Fuel supply payment'),
    (gen_random_uuid(), 'Creditor B', 'CRD002', 2500, 'USD', '2024-07-20', 'pending', 'Equipment maintenance'),
    (gen_random_uuid(), 'Creditor C', 'CRD003', 3000000, 'CDF', '2024-07-25', 'pending', 'Station supplies')
ON CONFLICT (creditor_code) DO NOTHING;

INSERT INTO account_payables (id, debtor_name, debtor_code, total_amount, currency, due_date, status, description) VALUES
    (gen_random_uuid(), 'Debtor A', 'DBT001', 2000000, 'CDF', '2024-07-18', 'pending', 'Fuel delivery payment'),
    (gen_random_uuid(), 'Debtor B', 'DBT002', 1500, 'USD', '2024-07-22', 'overdue', 'Service charges'),
    (gen_random_uuid(), 'Debtor C', 'DBT003', 4000000, 'CDF', '2024-07-28', 'pending', 'Equipment purchase')
ON CONFLICT (debtor_code) DO NOTHING;

-- Force schema refresh
NOTIFY pgrst, 'reload schema';