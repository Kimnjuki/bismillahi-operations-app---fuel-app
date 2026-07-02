-- Minimal Database Schema Fix for Bismillahi Operations

-- Fix security_events table
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW();
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
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    user_id UUID,
    station_id VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'medium',
    data JSONB
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    receipt_number VARCHAR(100),
    payment_method VARCHAR(50),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_by UUID,
    station_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    current_stock DECIMAL(12,2) DEFAULT 0,
    minimum_stock DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    station_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS stock_variances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    stock_item_id UUID REFERENCES stock_items(id),
    actual_quantity DECIMAL(12,2) NOT NULL,
    variance DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_by UUID,
    station_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS fund_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    from_account VARCHAR(255) NOT NULL,
    to_account VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CDF',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0,
    purpose TEXT,
    transfer_date DATE DEFAULT CURRENT_DATE,
    created_by UUID
);

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    updated_by UUID
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Fix RLS policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_simple ON users;
CREATE POLICY users_simple ON users FOR ALL USING (true);

-- Enable RLS on other tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create simple policies for all tables
CREATE POLICY notifications_policy ON notifications FOR ALL USING (true);
CREATE POLICY expenses_policy ON expenses FOR ALL USING (true);
CREATE POLICY stock_items_policy ON stock_items FOR ALL USING (true);
CREATE POLICY stock_variances_policy ON stock_variances FOR ALL USING (true);
CREATE POLICY fund_transfers_policy ON fund_transfers FOR ALL USING (true);
CREATE POLICY exchange_rates_policy ON exchange_rates FOR ALL USING (true);
CREATE POLICY expense_categories_policy ON expense_categories FOR ALL USING (true);

-- Insert some default expense categories
INSERT INTO expense_categories (name, description) VALUES
('Generator', 'Generator fuel, maintenance, and related expenses'),
('Workers'' fare and lunch', 'Transportation and meal allowances for workers'),
('Security', 'Security services and equipment'),
('Transport', 'General transportation and logistics expenses'),
('Government expenses', 'Government fees, taxes, and compliance costs'),
('Offloading expenses', 'Loading, unloading, and handling expenses'),
('Medical', 'Medical and health-related expenses'),
('Travel expenses', 'Business travel and accommodation costs'),
('Communication', 'Phone, internet, and communication services'),
('Salary', 'Employee salaries and wages'),
('Stationaries', 'Office stationery and supplies'),
('Discount', 'Discounts, rebates, and allowances'),
('Sadaqa', 'Charitable donations and religious contributions'),
('Repair and Maintenance', 'Equipment and facility repair and maintenance'),
('Rent', 'Facility and equipment rental expenses')
ON CONFLICT DO NOTHING;
