-- Fix database schema to match app expectations
-- This script adds missing columns and tables

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(10) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS station_id UUID;

-- Create stations table if it doesn't exist
CREATE TABLE IF NOT EXISTS stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for station_id
ALTER TABLE users ADD CONSTRAINT fk_users_station_id 
  FOREIGN KEY (station_id) REFERENCES stations(id);

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- Add missing columns to stock_items table
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to stock_variances table
ALTER TABLE stock_variances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to fund_transfers table
ALTER TABLE fund_transfers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to exchange_rates table
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- Create daily_sales table (alternative to pump_sales and drum_sales)
CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_type VARCHAR(20) NOT NULL CHECK (sale_type IN ('pump', 'drum')),
  pump_number INTEGER,
  fuel_type VARCHAR(100),
  drum_type VARCHAR(100),
  volume_liters DECIMAL(10,2),
  quantity INTEGER,
  price_per_liter DECIMAL(10,2),
  price_per_drum DECIMAL(10,2),
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  sale_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for daily_sales
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_created_by ON daily_sales(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_sales_type ON daily_sales(sale_type);

-- Insert default station if none exists
INSERT INTO stations (id, name, location) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Station', 'Default Location')
ON CONFLICT (id) DO NOTHING;

-- Update users to have default station if station_id is null
UPDATE users SET station_id = '00000000-0000-0000-0000-000000000001' 
WHERE station_id IS NULL;

-- Create demo users with proper user_code and pin_hash
INSERT INTO users (id, user_code, email, full_name, role, pin_hash, station_id, is_active) VALUES
('demo-1', 'A001', 'admin@bismillahi.com', 'Admin User', 'admin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '00000000-0000-0000-0000-000000000001', true),
('demo-2', 'A002', 'manager@bismillahi.com', 'Manager User', 'manager', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '00000000-0000-0000-0000-000000000001', true),
('demo-3', 'A003', 'cashier@bismillahi.com', 'Cashier User', 'cashier', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '00000000-0000-0000-0000-000000000001', true),
('demo-4', 'A004', 'viewer@bismillahi.com', 'Viewer User', 'viewer', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (user_code) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  pin_hash = EXCLUDED.pin_hash,
  station_id = EXCLUDED.station_id,
  is_active = EXCLUDED.is_active;

-- Enable RLS on new tables
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stations
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

-- Create RLS policies for security_events
CREATE POLICY "Users can view their security events" ON security_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security events" ON security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert security events" ON security_events
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for daily_sales
CREATE POLICY "Users can view daily sales" ON daily_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Cashiers can insert daily sales" ON daily_sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier')
    )
  );

CREATE POLICY "Managers can update daily sales" ON daily_sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete daily sales" ON daily_sales
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create triggers for updated_at on new tables
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();











