-- QUICK FIX: Run this in Supabase SQL Editor immediately
-- This addresses the most critical issues

-- 1. Fix Users Policy (CRITICAL - blocks all operations)
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS users_simple ON users;

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_simple ON users FOR ALL USING (true);

-- 2. Add missing columns
ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;

-- 3. Create missing tables
CREATE TABLE IF NOT EXISTS account_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    creditor_name VARCHAR(255),
    creditor_code VARCHAR(100) UNIQUE,
    total_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    created_by UUID
);

CREATE TABLE IF NOT EXISTS account_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    debtor_name VARCHAR(255),
    debtor_code VARCHAR(100) UNIQUE,
    total_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'CDF',
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    created_by UUID
);

-- 4. Enable RLS and create simple policies
ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_receivables_simple ON account_receivables FOR ALL USING (true);
CREATE POLICY account_payables_simple ON account_payables FOR ALL USING (true);

-- 5. Force schema refresh
NOTIFY pgrst, 'reload schema';







