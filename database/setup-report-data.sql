-- Setup database structure for daily consolidated reports

-- Ensure daily_sales table has all required columns
ALTER TABLE daily_sales 
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- Create index for better performance on date and station queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_date_station ON daily_sales(sale_date, station_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_fuel_type ON daily_sales(fuel_type);

-- Ensure expenses table has station reference
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- Create index for expenses by date and station
CREATE INDEX IF NOT EXISTS idx_expenses_date_station ON expenses(expense_date, station_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Create stock_movements table for tracking stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID REFERENCES stations(id),
  item_name VARCHAR(100) NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment', etc.
  reference_id UUID,
  movement_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_date_station ON stock_movements(movement_date, station_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_name);

-- Create stock_balances table for daily stock snapshots
CREATE TABLE IF NOT EXISTS stock_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID REFERENCES stations(id),
  item_name VARCHAR(100) NOT NULL,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(station_id, item_name, balance_date)
);

-- Create index for stock balances
CREATE INDEX IF NOT EXISTS idx_stock_balances_date_station ON stock_balances(balance_date, station_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_item ON stock_balances(item_name);

-- Enable RLS on new tables
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_movements
CREATE POLICY "Users can view stock movements" ON stock_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage stock movements" ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create policies for stock_balances
CREATE POLICY "Users can view stock balances" ON stock_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cashier', 'viewer')
    )
  );

CREATE POLICY "Managers can manage stock balances" ON stock_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Insert sample stock items if they don't exist
INSERT INTO stock_items (item_name, category, unit, current_stock, minimum_stock, selling_price)
VALUES 
('PMS', 'Fuel', 'Liters', 10000, 1000, 2850.50),
('AGO', 'Fuel', 'Liters', 8000, 1000, 2650.25)
ON CONFLICT (item_name) DO NOTHING;

-- Create a function to calculate stock variances
CREATE OR REPLACE FUNCTION calculate_stock_variance(
  p_station_id UUID,
  p_item_name VARCHAR,
  p_date DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  expected_quantity DECIMAL(10,2);
  actual_quantity DECIMAL(10,2);
BEGIN
  -- Get expected quantity from stock movements
  SELECT COALESCE(SUM(
    CASE 
      WHEN movement_type = 'in' THEN quantity
      WHEN movement_type = 'out' THEN -quantity
      ELSE 0
    END
  ), 0) INTO expected_quantity
  FROM stock_movements
  WHERE station_id = p_station_id 
    AND item_name = p_item_name
    AND movement_date <= p_date;
  
  -- Get actual quantity from stock balances
  SELECT COALESCE(closing_balance, 0) INTO actual_quantity
  FROM stock_balances
  WHERE station_id = p_station_id 
    AND item_name = p_item_name
    AND balance_date = p_date;
  
  RETURN actual_quantity - expected_quantity;
END;
$$ LANGUAGE plpgsql;











