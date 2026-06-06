-- Fix expenses table to match the app requirements
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS memo TEXT,
ADD COLUMN IF NOT EXISTS receipt_image TEXT;

-- Fix users table to include missing columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS push_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS station_id UUID;

-- Create stations table
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
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_station
FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;

-- Create daily_sales table to replace pump_sales and drum_sales
CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_type VARCHAR(20) NOT NULL CHECK (sale_type IN ('pump', 'drum')),
  pump_number INTEGER,
  fuel_type VARCHAR(100) NOT NULL,
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

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default stations
INSERT INTO stations (name, location) VALUES
('ISSIRO STATION', 'Isiro, DRC'),
('DEPOT ISSIRO', 'Isiro, DRC'),
('RUNGU STATION', 'Rungu, DRC'),
('DUNGU STATION', 'Dungu, DRC'),
('DURBA STATION', 'Durba, DRC'),
('NIANGARA STATION', 'Niangara, DRC')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_created_by ON daily_sales(created_by);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_users_station_id ON users(station_id);

-- Enable RLS on new tables
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
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

CREATE POLICY "Users can view security events" ON security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert security events" ON security_events
  FOR INSERT WITH CHECK (true);











