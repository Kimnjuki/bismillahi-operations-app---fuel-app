-- Update stock management schema for multi-station support

-- Create stations table if it doesn't exist
CREATE TABLE IF NOT EXISTS stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default stations
INSERT INTO stations (id, name, code, location) VALUES
('1', 'ISSIRO STATION', 'ISS', 'Isiro'),
('2', 'DEPOT ISSIRO', 'DEP', 'Isiro Depot'),
('3', 'RUNGU STATION', 'RUN', 'Rungu'),
('4', 'DUNGU STATION', 'DUN', 'Dungu'),
('5', 'DURBA STATION', 'DUR', 'Durba'),
('6', 'NIANGARA STATION', 'NIA', 'Niangara')
ON CONFLICT (id) DO NOTHING;

-- Create stock_balances table for current stock levels
CREATE TABLE IF NOT EXISTS stock_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID REFERENCES stations(id) NOT NULL,
    pms_balance DECIMAL(10,2) DEFAULT 0,
    ago_balance DECIMAL(10,2) DEFAULT 0,
    pms_minimum DECIMAL(10,2) DEFAULT 1000,
    ago_minimum DECIMAL(10,2) DEFAULT 500,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(station_id)
);

-- Create daily_stock_entries table for daily stock book
CREATE TABLE IF NOT EXISTS daily_stock_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID REFERENCES stations(id) NOT NULL,
    pms_received DECIMAL(10,2) DEFAULT 0,
    ago_received DECIMAL(10,2) DEFAULT 0,
    pms_sold DECIMAL(10,2) DEFAULT 0,
    ago_sold DECIMAL(10,2) DEFAULT 0,
    pms_variance DECIMAL(10,2) DEFAULT 0,
    ago_variance DECIMAL(10,2) DEFAULT 0,
    entry_date DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stock_balances_station_id ON stock_balances(station_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_entries_station_id ON daily_stock_entries(station_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_entries_date ON daily_stock_entries(entry_date);

-- Insert sample stock data for all stations
INSERT INTO stock_balances (station_id, pms_balance, ago_balance, pms_minimum, ago_minimum) VALUES
('1', 12500, 8750, 1000, 500),
('2', 15000, 12000, 2000, 1000),
('3', 8500, 6500, 1000, 500),
('4', 9500, 7200, 1000, 500),
('5', 11000, 8000, 1000, 500),
('6', 7500, 5500, 1000, 500)
ON CONFLICT (station_id) DO UPDATE SET
    pms_balance = EXCLUDED.pms_balance,
    ago_balance = EXCLUDED.ago_balance,
    last_updated = NOW();

-- Insert sample daily entries
INSERT INTO daily_stock_entries (station_id, pms_received, ago_received, pms_sold, ago_sold, pms_variance, ago_variance, entry_date, created_by) VALUES
('1', 5000, 3000, 4800, 2900, 200, 100, CURRENT_DATE, (SELECT id FROM users LIMIT 1)),
('2', 8000, 5000, 7500, 4800, 500, 200, CURRENT_DATE, (SELECT id FROM users LIMIT 1)),
('3', 3000, 2000, 2800, 1900, 200, 100, CURRENT_DATE, (SELECT id FROM users LIMIT 1)),
('4', 4000, 2500, 3800, 2400, 200, 100, CURRENT_DATE, (SELECT id FROM users LIMIT 1)),
('5', 6000, 3500, 5800, 3400, 200, 100, CURRENT_DATE, (SELECT id FROM users LIMIT 1)),
('6', 2500, 1500, 2300, 1400, 200, 100, CURRENT_DATE, (SELECT id FROM users LIMIT 1));

-- Create function to update stock balances when daily entries are added
CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock balance for the station
    INSERT INTO stock_balances (station_id, pms_balance, ago_balance, pms_minimum, ago_minimum, last_updated, updated_by)
    VALUES (
        NEW.station_id,
        COALESCE((SELECT pms_balance FROM stock_balances WHERE station_id = NEW.station_id), 0) + NEW.pms_received - NEW.pms_sold,
        COALESCE((SELECT ago_balance FROM stock_balances WHERE station_id = NEW.station_id), 0) + NEW.ago_received - NEW.ago_sold,
        COALESCE((SELECT pms_minimum FROM stock_balances WHERE station_id = NEW.station_id), 1000),
        COALESCE((SELECT ago_minimum FROM stock_balances WHERE station_id = NEW.station_id), 500),
        NOW(),
        NEW.created_by
    )
    ON CONFLICT (station_id) DO UPDATE SET
        pms_balance = stock_balances.pms_balance + NEW.pms_received - NEW.pms_sold,
        ago_balance = stock_balances.ago_balance + NEW.ago_received - NEW.ago_sold,
        last_updated = NOW(),
        updated_by = NEW.created_by;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock balances
DROP TRIGGER IF EXISTS trigger_update_stock_balance ON daily_stock_entries;
CREATE TRIGGER trigger_update_stock_balance
    AFTER INSERT ON daily_stock_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_balance();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_stock_entries TO authenticated;











