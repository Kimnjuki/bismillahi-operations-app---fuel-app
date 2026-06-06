-- Bismillahi Operations Database Setup
-- Run this script in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'viewer');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'credit');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pump Sales table
CREATE TABLE IF NOT EXISTS pump_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pump_number INTEGER NOT NULL,
  fuel_type VARCHAR(100) NOT NULL,
  volume_liters DECIMAL(10,2) NOT NULL,
  price_per_liter DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  sale_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drum Sales table
CREATE TABLE IF NOT EXISTS drum_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drum_type VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_drum DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  sale_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Items table
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Stock Variances table
CREATE TABLE IF NOT EXISTS stock_variances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID REFERENCES stock_items(id),
  expected_quantity DECIMAL(10,2) NOT NULL,
  actual_quantity DECIMAL(10,2) NOT NULL,
  variance DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  receipt_number VARCHAR(100),
  payment_method payment_method NOT NULL,
  expense_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund Transfers table
CREATE TABLE IF NOT EXISTS fund_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_account VARCHAR(255) NOT NULL,
  to_account VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  exchange_rate DECIMAL(10,4),
  converted_amount DECIMAL(12,2),
  purpose TEXT,
  transfer_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange Rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,4) NOT NULL,
  effective_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  user_id UUID REFERENCES users(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description) VALUES
('Fuel', 'Petrol, diesel, and other fuel expenses'),
('Maintenance', 'Vehicle and equipment maintenance'),
('Repairs', 'Equipment and facility repairs'),
('Utilities', 'Electricity, water, internet bills'),
('Rent', 'Office and facility rent'),
('Salaries', 'Staff salaries and wages'),
('Insurance', 'Vehicle and property insurance'),
('Licenses', 'Business licenses and permits'),
('Marketing', 'Advertising and promotional expenses'),
('Office Supplies', 'Stationery and office materials'),
('Communication', 'Phone bills and communication services'),
('Transportation', 'Travel and transportation costs'),
('Professional Services', 'Legal, accounting, consulting fees'),
('Training', 'Staff training and development'),
('Security', 'Security services and equipment'),
('Cleaning', 'Cleaning supplies and services'),
('Medical', 'Medical expenses and health insurance'),
('Bank Charges', 'Bank fees and transaction charges'),
('Miscellaneous', 'Other miscellaneous expenses'),
('Taxes', 'Tax payments and obligations')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pump_sales_date ON pump_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_pump_sales_created_by ON pump_sales(created_by);
CREATE INDEX IF NOT EXISTS idx_drum_sales_date ON drum_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_drum_sales_created_by ON drum_sales(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_date ON fund_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_created_by ON fund_transfers(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE drum_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drop existing policies for other tables
DROP POLICY IF EXISTS "Users can view pump sales" ON pump_sales;
DROP POLICY IF EXISTS "Cashiers can insert pump sales" ON pump_sales;
DROP POLICY IF EXISTS "Managers can update pump sales" ON pump_sales;
DROP POLICY IF EXISTS "Admins can delete pump sales" ON pump_sales;

-- Pump Sales policies
CREATE POLICY "Users can view pump sales" ON pump_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Cashiers can insert pump sales" ON pump_sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

CREATE POLICY "Managers can update pump sales" ON pump_sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete pump sales" ON pump_sales
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drop existing policies for drum sales
DROP POLICY IF EXISTS "Users can view drum sales" ON drum_sales;
DROP POLICY IF EXISTS "Cashiers can insert drum sales" ON drum_sales;
DROP POLICY IF EXISTS "Managers can update drum sales" ON drum_sales;
DROP POLICY IF EXISTS "Admins can delete drum sales" ON drum_sales;

-- Drum Sales policies (similar to pump sales)
CREATE POLICY "Users can view drum sales" ON drum_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Cashiers can insert drum sales" ON drum_sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

CREATE POLICY "Managers can update drum sales" ON drum_sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete drum sales" ON drum_sales
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drop existing policies for stock items
DROP POLICY IF EXISTS "Users can view stock items" ON stock_items;
DROP POLICY IF EXISTS "Managers can manage stock items" ON stock_items;

-- Stock Items policies
CREATE POLICY "Users can view stock items" ON stock_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage stock items" ON stock_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Drop existing policies for stock variances
DROP POLICY IF EXISTS "Users can view stock variances" ON stock_variances;
DROP POLICY IF EXISTS "Managers can manage stock variances" ON stock_variances;

-- Stock Variances policies
CREATE POLICY "Users can view stock variances" ON stock_variances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage stock variances" ON stock_variances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Drop existing policies for expenses
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can manage expenses" ON expenses;

-- Expenses policies
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Drop existing policies for fund transfers
DROP POLICY IF EXISTS "Users can view fund transfers" ON fund_transfers;
DROP POLICY IF EXISTS "Managers can manage fund transfers" ON fund_transfers;

-- Fund Transfers policies
CREATE POLICY "Users can view fund transfers" ON fund_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage fund transfers" ON fund_transfers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Drop existing policies for exchange rates
DROP POLICY IF EXISTS "Users can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Managers can manage exchange rates" ON exchange_rates;

-- Exchange Rates policies
CREATE POLICY "Users can view exchange rates" ON exchange_rates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage exchange rates" ON exchange_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Drop existing policies for notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Drop existing policies for expense categories
DROP POLICY IF EXISTS "Users can view expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Admins can manage expense categories" ON expense_categories;

-- Expense Categories policies
CREATE POLICY "Users can view expense categories" ON expense_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Admins can manage expense categories" ON expense_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user (you should change this password)
-- Note: This will create a user in the auth.users table and sync it with our users table
-- You'll need to create this user through Supabase Auth UI first, then run this:
-- INSERT INTO users (id, email, full_name, role) 
-- VALUES ('your-admin-user-id', 'admin@bismillahi.com', 'System Administrator', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
