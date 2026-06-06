-- Fix security_events table schema issues
-- This script addresses the missing timestamp column and other schema issues

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the timestamp column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' 
        AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE security_events ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE security_events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for security_events
DROP POLICY IF EXISTS "Users can view their own security events" ON security_events;
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all security events" ON security_events;
CREATE POLICY "Service role can manage all security events" ON security_events
    FOR ALL USING (auth.role() = 'service_role');

-- Fix daily_sales table issues
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN total_amount DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'price_per_liter'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN price_per_liter DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Fix users table issues
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'cashier';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create operational_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS operational_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    account_code VARCHAR(100) UNIQUE,
    account_type VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'CDF',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES operational_accounts(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE operational_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for operational_accounts
DROP POLICY IF EXISTS "Users can view operational accounts" ON operational_accounts;
CREATE POLICY "Users can view operational accounts" ON operational_accounts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage operational accounts" ON operational_accounts;
CREATE POLICY "Service role can manage operational accounts" ON operational_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for account_transactions
DROP POLICY IF EXISTS "Users can view account transactions" ON account_transactions;
CREATE POLICY "Users can view account transactions" ON account_transactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage account transactions" ON account_transactions;
CREATE POLICY "Service role can manage account transactions" ON account_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operational_accounts_name ON operational_accounts(name);
CREATE INDEX IF NOT EXISTS idx_operational_accounts_type ON operational_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at);

-- Insert some sample operational accounts
INSERT INTO operational_accounts (name, account_code, account_type, balance, currency, description) VALUES
('ISSE VURRA CDF', 'ISS-CDF-001', 'Tax Account', 1250000, 'CDF', 'Tax collection account in CDF'),
('ISSE VURRA USD', 'ISS-USD-001', 'Tax Account', 5000, 'USD', 'Tax collection account in USD'),
('OTHER TAX ACC', 'TAX-001', 'Tax Account', 750000, 'CDF', 'Other tax collection account'),
('MAINTENANCE FUND', 'MAINT-001', 'Operations Account', 2000000, 'CDF', 'Equipment maintenance fund'),
('EQUIPMENT FUND', 'EQUIP-001', 'Operations Account', 3500000, 'CDF', 'Equipment purchase fund'),
('EMERGENCY FUND', 'EMERG-001', 'Operations Account', 1000000, 'CDF', 'Emergency operations fund')
ON CONFLICT (account_code) DO NOTHING;

-- Insert some sample transactions
INSERT INTO account_transactions (account_id, transaction_type, amount, currency, description, reference) 
SELECT 
    oa.id,
    'credit',
    500000,
    'CDF',
    'Tax collection deposit',
    'TXN-001'
FROM operational_accounts oa 
WHERE oa.name = 'ISSE VURRA CDF'
ON CONFLICT DO NOTHING;

INSERT INTO account_transactions (account_id, transaction_type, amount, currency, description, reference) 
SELECT 
    oa.id,
    'debit',
    25000,
    'CDF',
    'Bank charges',
    'TXN-002'
FROM operational_accounts oa 
WHERE oa.name = 'ISSE VURRA CDF'
ON CONFLICT DO NOTHING;

INSERT INTO account_transactions (account_id, transaction_type, amount, currency, description, reference) 
SELECT 
    oa.id,
    'credit',
    2000,
    'USD',
    'USD tax collection',
    'TXN-003'
FROM operational_accounts oa 
WHERE oa.name = 'ISSE VURRA USD'
ON CONFLICT DO NOTHING;

-- Update the updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for operational_accounts
DROP TRIGGER IF EXISTS update_operational_accounts_updated_at ON operational_accounts;
CREATE TRIGGER update_operational_accounts_updated_at
    BEFORE UPDATE ON operational_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();





