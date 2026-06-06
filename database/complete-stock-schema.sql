-- Comprehensive Stock Management Schema Update
-- This script adds the necessary tables and columns for stock management

-- First, let's ensure we have the stations table with proper structure
-- Add missing columns to stations table if they don't exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stations' AND column_name = 'status') THEN
        ALTER TABLE stations ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
    
    -- Add code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stations' AND column_name = 'code') THEN
        ALTER TABLE stations ADD COLUMN code VARCHAR(10);
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stations' AND column_name = 'location') THEN
        ALTER TABLE stations ADD COLUMN location VARCHAR(255);
    END IF;
END $$;

-- Update existing stations with proper codes and status
UPDATE stations SET 
    code = CASE 
        WHEN name ILIKE '%ISSIRO%' AND name ILIKE '%DEPOT%' THEN 'DEP'
        WHEN name ILIKE '%ISSIRO%' THEN 'ISS'
        WHEN name ILIKE '%RUNGU%' THEN 'RUN'
        WHEN name ILIKE '%DUNGU%' THEN 'DUN'
        WHEN name ILIKE '%DURBA%' THEN 'DUR'
        WHEN name ILIKE '%NIANGARA%' THEN 'NIA'
        ELSE SUBSTRING(name, 1, 3)
    END,
    status = 'active',
    location = CASE 
        WHEN name ILIKE '%ISSIRO%' AND name ILIKE '%DEPOT%' THEN 'Isiro Depot'
        WHEN name ILIKE '%ISSIRO%' THEN 'Isiro'
        WHEN name ILIKE '%RUNGU%' THEN 'Rungu'
        WHEN name ILIKE '%DUNGU%' THEN 'Dungu'
        WHEN name ILIKE '%DURBA%' THEN 'Durba'
        WHEN name ILIKE '%NIANGARA%' THEN 'Niangara'
        ELSE 'Unknown'
    END
WHERE code IS NULL OR status IS NULL;

-- Create stock_levels table for current stock tracking
CREATE TABLE IF NOT EXISTS stock_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID REFERENCES stations(id) NOT NULL,
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('PMS', 'AGO')),
    current_stock DECIMAL(10,2) DEFAULT 0,
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    maximum_stock DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(station_id, product_type)
);

-- Create daily_stock_transactions table for daily stock book
CREATE TABLE IF NOT EXISTS daily_stock_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID REFERENCES stations(id) NOT NULL,
    transaction_date DATE NOT NULL,
    pms_received DECIMAL(10,2) DEFAULT 0,
    ago_received DECIMAL(10,2) DEFAULT 0,
    pms_sold DECIMAL(10,2) DEFAULT 0,
    ago_sold DECIMAL(10,2) DEFAULT 0,
    pms_variance DECIMAL(10,2) DEFAULT 0,
    ago_variance DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_levels_station_id ON stock_levels(station_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product_type ON stock_levels(product_type);
CREATE INDEX IF NOT EXISTS idx_daily_stock_transactions_station_id ON daily_stock_transactions(station_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_transactions_date ON daily_stock_transactions(transaction_date);

-- Insert default stock levels for all stations
INSERT INTO stock_levels (station_id, product_type, current_stock, minimum_stock, maximum_stock)
SELECT 
    s.id,
    'PMS',
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 15000
        ELSE 10000 + (random() * 5000)::int
    END,
    1000,
    20000,
    NOW(),
    (SELECT id FROM users LIMIT 1)
FROM stations s
WHERE s.status = 'active'
ON CONFLICT (station_id, product_type) DO NOTHING;

INSERT INTO stock_levels (station_id, product_type, current_stock, minimum_stock, maximum_stock)
SELECT 
    s.id,
    'AGO',
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 12000
        ELSE 8000 + (random() * 3000)::int
    END,
    500,
    15000,
    NOW(),
    (SELECT id FROM users LIMIT 1)
FROM stations s
WHERE s.status = 'active'
ON CONFLICT (station_id, product_type) DO NOTHING;

-- Create function to update stock levels when transactions are added
CREATE OR REPLACE FUNCTION update_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    -- Update PMS stock level
    UPDATE stock_levels 
    SET 
        current_stock = current_stock + NEW.pms_received - NEW.pms_sold,
        last_updated = NOW(),
        updated_by = NEW.created_by
    WHERE station_id = NEW.station_id AND product_type = 'PMS';
    
    -- Update AGO stock level
    UPDATE stock_levels 
    SET 
        current_stock = current_stock + NEW.ago_received - NEW.ago_sold,
        last_updated = NOW(),
        updated_by = NEW.created_by
    WHERE station_id = NEW.station_id AND product_type = 'AGO';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock levels
DROP TRIGGER IF EXISTS trigger_update_stock_levels ON daily_stock_transactions;
CREATE TRIGGER trigger_update_stock_levels
    AFTER INSERT ON daily_stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_levels();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_stock_transactions TO authenticated;

-- Insert sample daily transactions for demonstration
INSERT INTO daily_stock_transactions (station_id, transaction_date, pms_received, ago_received, pms_sold, ago_sold, pms_variance, ago_variance, created_by)
SELECT 
    s.id,
    CURRENT_DATE,
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 8000
        ELSE 3000 + (random() * 2000)::int
    END,
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 5000
        ELSE 2000 + (random() * 1000)::int
    END,
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 7500
        ELSE 2800 + (random() * 1500)::int
    END,
    CASE 
        WHEN s.name ILIKE '%DEPOT%' THEN 4800
        ELSE 1900 + (random() * 800)::int
    END,
    200,
    100,
    (SELECT id FROM users LIMIT 1)
FROM stations s
WHERE s.status = 'active'
ON CONFLICT DO NOTHING;











