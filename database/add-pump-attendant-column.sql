-- Add pump_attendant column to daily_sales table
-- This column tracks which pump attendant handled each pump sale
ALTER TABLE daily_sales 
ADD COLUMN IF NOT EXISTS pump_attendant VARCHAR(255);

-- Create index for faster queries by pump_attendant
CREATE INDEX IF NOT EXISTS idx_daily_sales_attendant ON daily_sales(pump_attendant);
CREATE INDEX IF NOT EXISTS idx_daily_sales_attendant_date ON daily_sales(pump_attendant, sale_date);

-- Update RLS policies to allow reading pump_attendant
-- (existing SELECT policies already cover this)