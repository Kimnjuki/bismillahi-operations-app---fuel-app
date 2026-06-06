-- Accounts Management Schema for BISMILLAHI Operations
-- This script creates the necessary tables for account receivables and payables

-- Account Receivables Table
CREATE TABLE IF NOT EXISTS account_receivables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creditor_name VARCHAR(255) NOT NULL,
    creditor_code VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'partial', 'cancelled')),
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    last_payment_date DATE,
    last_payment_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account Payables Table
CREATE TABLE IF NOT EXISTS account_payables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debtor_name VARCHAR(255) NOT NULL,
    debtor_code VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'partial', 'cancelled')),
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    last_payment_date DATE,
    last_payment_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account Transactions Table
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('receivable', 'payable')),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'adjustment', 'refund')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference_number VARCHAR(100),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_receivables_creditor_code ON account_receivables(creditor_code);
CREATE INDEX IF NOT EXISTS idx_account_receivables_status ON account_receivables(status);
CREATE INDEX IF NOT EXISTS idx_account_receivables_due_date ON account_receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_account_receivables_created_by ON account_receivables(created_by);

CREATE INDEX IF NOT EXISTS idx_account_payables_debtor_code ON account_payables(debtor_code);
CREATE INDEX IF NOT EXISTS idx_account_payables_status ON account_payables(status);
CREATE INDEX IF NOT EXISTS idx_account_payables_due_date ON account_payables(due_date);
CREATE INDEX IF NOT EXISTS idx_account_payables_created_by ON account_payables(created_by);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_type ON account_transactions(account_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_transaction_date ON account_transactions(transaction_date);

-- Row Level Security (RLS) Policies
ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_receivables
CREATE POLICY "Users can view all receivables" ON account_receivables
    FOR SELECT USING (true);

CREATE POLICY "Users can insert receivables" ON account_receivables
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update receivables" ON account_receivables
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete receivables" ON account_receivables
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for account_payables
CREATE POLICY "Users can view all payables" ON account_payables
    FOR SELECT USING (true);

CREATE POLICY "Users can insert payables" ON account_payables
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update payables" ON account_payables
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete payables" ON account_payables
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for account_transactions
CREATE POLICY "Users can view all transactions" ON account_transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON account_transactions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update transactions" ON account_transactions
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete transactions" ON account_transactions
    FOR DELETE USING (auth.uid() = created_by);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_account_receivables_updated_at 
    BEFORE UPDATE ON account_receivables 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_payables_updated_at 
    BEFORE UPDATE ON account_payables 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_transactions_updated_at 
    BEFORE UPDATE ON account_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically mark accounts as overdue
CREATE OR REPLACE FUNCTION mark_overdue_accounts()
RETURNS void AS $$
BEGIN
    -- Mark overdue receivables
    UPDATE account_receivables 
    SET status = 'overdue', updated_at = NOW()
    WHERE due_date < CURRENT_DATE 
    AND status NOT IN ('paid', 'cancelled');
    
    -- Mark overdue payables
    UPDATE account_payables 
    SET status = 'overdue', updated_at = NOW()
    WHERE due_date < CURRENT_DATE 
    AND status NOT IN ('paid', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO account_receivables (
    creditor_name, creditor_code, contact_person, phone, email, 
    total_amount, due_date, status, description, created_by
) VALUES 
(
    'Creditor A', 'CRD001', 'John Doe', '+243123456789', 'john@creditora.com',
    5000000, '2024-07-15', 'overdue', 'Fuel supply payment', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Creditor B', 'CRD002', 'Jane Smith', '+243987654321', 'jane@creditorb.com',
    2500, '2024-07-20', 'pending', 'Equipment maintenance', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Creditor C', 'CRD003', 'Mike Johnson', '+243555666777', 'mike@creditorc.com',
    3000000, '2024-07-25', 'pending', 'Station supplies', 
    (SELECT id FROM auth.users LIMIT 1)
);

INSERT INTO account_payables (
    debtor_name, debtor_code, contact_person, phone, email, 
    total_amount, due_date, status, description, created_by
) VALUES 
(
    'Debtor A', 'DBT001', 'Alice Brown', '+243111222333', 'alice@debtora.com',
    2000000, '2024-07-18', 'pending', 'Fuel delivery payment', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Debtor B', 'DBT002', 'Bob Wilson', '+243444555666', 'bob@debtorb.com',
    1500, '2024-07-22', 'pending', 'Service charges', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Debtor C', 'DBT003', 'Carol Davis', '+243777888999', 'carol@debtorc.com',
    4000000, '2024-07-28', 'pending', 'Equipment purchase', 
    (SELECT id FROM auth.users LIMIT 1)
);

-- Create a view for account summary
CREATE OR REPLACE VIEW account_summary AS
SELECT 
    'receivable' as account_type,
    COUNT(*) as total_count,
    SUM(total_amount) as total_amount,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
    SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount
FROM account_receivables
WHERE status NOT IN ('paid', 'cancelled')

UNION ALL

SELECT 
    'payable' as account_type,
    COUNT(*) as total_count,
    SUM(total_amount) as total_amount,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
    SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount
FROM account_payables
WHERE status NOT IN ('paid', 'cancelled');

-- Grant necessary permissions
GRANT ALL ON account_receivables TO authenticated;
GRANT ALL ON account_payables TO authenticated;
GRANT ALL ON account_transactions TO authenticated;
GRANT SELECT ON account_summary TO authenticated;

-- Comments for documentation
COMMENT ON TABLE account_receivables IS 'Stores information about money owed to the company by customers/creditors';
COMMENT ON TABLE account_payables IS 'Stores information about money the company owes to suppliers/debtors';
COMMENT ON TABLE account_transactions IS 'Stores transaction history for accounts (payments, adjustments, refunds)';
COMMENT ON VIEW account_summary IS 'Provides summary statistics for receivables and payables';










