-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'viewer');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'credit');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stations table
CREATE TABLE stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  station_name VARCHAR(255) NOT NULL,
  station_code VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id)
);

-- Internal Accounts table
CREATE TABLE internal_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  account_name VARCHAR(255) NOT NULL,
  account_code VARCHAR(100),
  account_type VARCHAR(50) NOT NULL,
  station_id UUID REFERENCES stations(id),
  balance DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id)
);

-- Pump Sales table
CREATE TABLE pump_sales (
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
CREATE TABLE drum_sales (
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
CREATE TABLE stock_items (
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
CREATE TABLE stock_variances (
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
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  receipt_number VARCHAR(100),
  payment_method payment_method NOT NULL,
  expense_date DATE NOT NULL,
  account_id UUID REFERENCES internal_accounts(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund Transfers table
CREATE TABLE fund_transfers (
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
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,4) NOT NULL,
  effective_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  user_id UUID REFERENCES users(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Categories table
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default expense categories
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
('Rent', 'Facility and equipment rental expenses');

-- Create indexes for better performance
CREATE INDEX idx_pump_sales_date ON pump_sales(sale_date);
CREATE INDEX idx_pump_sales_created_by ON pump_sales(created_by);
CREATE INDEX idx_drum_sales_date ON drum_sales(sale_date);
CREATE INDEX idx_drum_sales_created_by ON drum_sales(created_by);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_fund_transfers_date ON fund_transfers(transfer_date);
CREATE INDEX idx_fund_transfers_created_by ON fund_transfers(created_by);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE drum_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

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

-- Stations policies
CREATE POLICY "Users can view stations" ON stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Admins can manage stations" ON stations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Internal Accounts policies
CREATE POLICY "Users can view internal accounts" ON internal_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Admins can manage internal accounts" ON internal_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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

-- Expenses policies
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Cashiers can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

CREATE POLICY "Managers can update expenses" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete expenses" ON expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

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

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_accounts_updated_at BEFORE UPDATE ON internal_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

