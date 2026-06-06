-- Update existing schema to fix common issues

-- Add missing columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS memo TEXT,
ADD COLUMN IF NOT EXISTS receipt_image TEXT;

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS push_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS station_id UUID;

-- Create stations table if it doesn't exist
CREATE TABLE IF NOT EXISTS stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for station_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_station' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_station
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create daily_sales table if it doesn't exist
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

-- Create security_events table if it doesn't exist
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

-- Insert default stations if they don't exist
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

-- Create basic policies for new tables
DO $$ 
BEGIN
  -- Stations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Users can view stations') THEN
    CREATE POLICY "Users can view stations" ON stations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
        )
      );
  END IF;

  -- Daily sales policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_sales' AND policyname = 'Users can view daily sales') THEN
    CREATE POLICY "Users can view daily sales" ON daily_sales
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
        )
      );
  END IF;

  -- Security events policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_events' AND policyname = 'Users can view security events') THEN
    CREATE POLICY "Users can view security events" ON security_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;











