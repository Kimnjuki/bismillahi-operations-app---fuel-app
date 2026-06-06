-- Fuel Delivery Management Schema for BISMILLAHI Operations
-- This script creates the necessary tables for fuel delivery tracking, transporter management, and tax payments

-- Transporters Table
CREATE TABLE IF NOT EXISTS transporters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transporter_name VARCHAR(255) NOT NULL,
    transporter_code VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    license_number VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stations Table
CREATE TABLE IF NOT EXISTS stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_name VARCHAR(255) NOT NULL,
    station_code VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    capacity_liters INTEGER NOT NULL DEFAULT 100000,
    current_stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel Deliveries Table
CREATE TABLE IF NOT EXISTS fuel_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_date DATE NOT NULL,
    product VARCHAR(50) NOT NULL CHECK (product IN ('Petrol', 'Diesel', 'Kerosene', 'Gas')),
    quantity_liters DECIMAL(10,2) NOT NULL,
    transporter_id UUID NOT NULL REFERENCES transporters(id),
    truck_id VARCHAR(100) NOT NULL,
    station_id UUID NOT NULL REFERENCES stations(id),
    isse_vurra_cdf DECIMAL(15,2) NOT NULL DEFAULT 0,
    isse_vurra_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_payment_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'in_transit', 'cancelled')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax Payments Table
CREATE TABLE IF NOT EXISTS tax_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_date DATE NOT NULL,
    amount_cdf DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    border_point VARCHAR(255) NOT NULL,
    truck_id VARCHAR(100) NOT NULL,
    transporter_id UUID NOT NULL REFERENCES transporters(id),
    payment_reference VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Truck Transactions Table
CREATE TABLE IF NOT EXISTS truck_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL,
    truck_id VARCHAR(100) NOT NULL,
    transporter_id UUID NOT NULL REFERENCES transporters(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('delivery', 'payment', 'tax', 'fuel_purchase', 'maintenance')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
    description TEXT NOT NULL,
    reference_number VARCHAR(100),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel Stock Table
CREATE TABLE IF NOT EXISTS fuel_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID NOT NULL REFERENCES stations(id),
    product VARCHAR(50) NOT NULL CHECK (product IN ('Petrol', 'Diesel', 'Kerosene', 'Gas')),
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    capacity DECIMAL(10,2) NOT NULL DEFAULT 100000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(station_id, product)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transporters_code ON transporters(transporter_code);
CREATE INDEX IF NOT EXISTS idx_transporters_active ON transporters(is_active);
CREATE INDEX IF NOT EXISTS idx_transporters_created_by ON transporters(created_by);

CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(station_code);
CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_created_by ON stations(created_by);

CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_date ON fuel_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_transporter ON fuel_deliveries(transporter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_station ON fuel_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_status ON fuel_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_created_by ON fuel_deliveries(created_by);

CREATE INDEX IF NOT EXISTS idx_tax_payments_date ON tax_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_transporter ON tax_payments(transporter_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_truck ON tax_payments(truck_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_status ON tax_payments(status);
CREATE INDEX IF NOT EXISTS idx_tax_payments_created_by ON tax_payments(created_by);

CREATE INDEX IF NOT EXISTS idx_truck_transactions_date ON truck_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_truck_transactions_truck ON truck_transactions(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_transactions_transporter ON truck_transactions(transporter_id);
CREATE INDEX IF NOT EXISTS idx_truck_transactions_type ON truck_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_truck_transactions_created_by ON truck_transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_fuel_stock_station ON fuel_stock(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_stock_product ON fuel_stock(product);
CREATE INDEX IF NOT EXISTS idx_fuel_stock_updated ON fuel_stock(last_updated);

-- Row Level Security (RLS) Policies
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stock ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transporters
CREATE POLICY "Users can view all transporters" ON transporters
    FOR SELECT USING (true);

CREATE POLICY "Users can insert transporters" ON transporters
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update transporters" ON transporters
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete transporters" ON transporters
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for stations
CREATE POLICY "Users can view all stations" ON stations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert stations" ON stations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update stations" ON stations
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete stations" ON stations
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for fuel_deliveries
CREATE POLICY "Users can view all fuel deliveries" ON fuel_deliveries
    FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel deliveries" ON fuel_deliveries
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update fuel deliveries" ON fuel_deliveries
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete fuel deliveries" ON fuel_deliveries
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for tax_payments
CREATE POLICY "Users can view all tax payments" ON tax_payments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tax payments" ON tax_payments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tax payments" ON tax_payments
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete tax payments" ON tax_payments
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for truck_transactions
CREATE POLICY "Users can view all truck transactions" ON truck_transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert truck transactions" ON truck_transactions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update truck transactions" ON truck_transactions
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete truck transactions" ON truck_transactions
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for fuel_stock
CREATE POLICY "Users can view all fuel stock" ON fuel_stock
    FOR SELECT USING (true);

CREATE POLICY "Users can insert fuel stock" ON fuel_stock
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update fuel stock" ON fuel_stock
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete fuel stock" ON fuel_stock
    FOR DELETE USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_transporters_updated_at 
    BEFORE UPDATE ON transporters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at 
    BEFORE UPDATE ON stations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_deliveries_updated_at 
    BEFORE UPDATE ON fuel_deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_payments_updated_at 
    BEFORE UPDATE ON tax_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_truck_transactions_updated_at 
    BEFORE UPDATE ON truck_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_stock_updated_at 
    BEFORE UPDATE ON fuel_stock 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update fuel stock when delivery is made
CREATE OR REPLACE FUNCTION update_fuel_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Update fuel stock when delivery status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        INSERT INTO fuel_stock (station_id, product, current_stock, capacity, last_updated, updated_by)
        VALUES (NEW.station_id, NEW.product, NEW.quantity_liters, 100000, NOW(), 'system')
        ON CONFLICT (station_id, product)
        DO UPDATE SET
            current_stock = fuel_stock.current_stock + NEW.quantity_liters,
            last_updated = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update fuel stock on delivery
CREATE TRIGGER update_fuel_stock_trigger
    AFTER INSERT OR UPDATE ON fuel_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_stock_on_delivery();

-- Insert sample data for testing
INSERT INTO transporters (
    transporter_name, transporter_code, contact_person, phone, email, 
    license_number, created_by
) VALUES 
(
    'Alpha Transport Ltd', 'ATL001', 'John Smith', '+243123456789', 'john@alphatransport.com',
    'LIC-ATL-001', (SELECT id FROM auth.users LIMIT 1)
),
(
    'Beta Logistics', 'BL002', 'Jane Doe', '+243987654321', 'jane@betalogistics.com',
    'LIC-BL-002', (SELECT id FROM auth.users LIMIT 1)
),
(
    'Gamma Freight', 'GF003', 'Mike Johnson', '+243555666777', 'mike@gammafreight.com',
    'LIC-GF-003', (SELECT id FROM auth.users LIMIT 1)
);

INSERT INTO stations (
    station_name, station_code, location, capacity_liters, current_stock, created_by
) VALUES 
(
    'Station 1', 'STN001', 'Kinshasa Central', 100000, 50000, (SELECT id FROM auth.users LIMIT 1)
),
(
    'Station 2', 'STN002', 'Lubumbashi North', 150000, 75000, (SELECT id FROM auth.users LIMIT 1)
),
(
    'Station 3', 'STN003', 'Kisangani East', 80000, 40000, (SELECT id FROM auth.users LIMIT 1)
);

INSERT INTO fuel_deliveries (
    delivery_date, product, quantity_liters, transporter_id, truck_id, station_id,
    isse_vurra_cdf, isse_vurra_usd, status, notes, created_by
) VALUES 
(
    '2024-03-15', 'Petrol', 10000, 
    (SELECT id FROM transporters LIMIT 1), 'T001000', 
    (SELECT id FROM stations LIMIT 1),
    5000000, 1750, 'delivered', 'Regular fuel delivery', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    '2024-03-05', 'Diesel', 12000, 
    (SELECT id FROM transporters OFFSET 1 LIMIT 1), 'T002000', 
    (SELECT id FROM stations OFFSET 1 LIMIT 1),
    6000000, 2100, 'delivered', 'Diesel delivery for Station 2', 
    (SELECT id FROM auth.users LIMIT 1)
);

INSERT INTO tax_payments (
    payment_date, amount_cdf, amount_usd, border_point, truck_id, transporter_id,
    payment_reference, status, notes, created_by
) VALUES 
(
    '2024-03-15', 250000, 88, 'Kasumbalesa Border', 'T001000',
    (SELECT id FROM transporters LIMIT 1),
    'TAX-001-2024', 'paid', 'Border tax payment', 
    (SELECT id FROM auth.users LIMIT 1)
),
(
    '2024-03-10', 300000, 105, 'Goma Border', 'T002000',
    (SELECT id FROM transporters OFFSET 1 LIMIT 1),
    'TAX-002-2024', 'paid', 'Border crossing tax', 
    (SELECT id FROM auth.users LIMIT 1)
);

INSERT INTO truck_transactions (
    transaction_date, truck_id, transporter_id, transaction_type, amount, currency,
    description, reference_number, created_by
) VALUES 
(
    '2024-03-15', 'T001000', (SELECT id FROM transporters LIMIT 1), 'delivery', 10000, 'CDF',
    'Fuel delivery to Station 1', 'DEL-001-2024', (SELECT id FROM auth.users LIMIT 1)
),
(
    '2024-03-15', 'T001000', (SELECT id FROM transporters LIMIT 1), 'tax', 250000, 'CDF',
    'Border tax payment', 'TAX-001-2024', (SELECT id FROM auth.users LIMIT 1)
),
(
    '2024-03-05', 'T002000', (SELECT id FROM transporters OFFSET 1 LIMIT 1), 'delivery', 12000, 'CDF',
    'Diesel delivery to Station 2', 'DEL-002-2024', (SELECT id FROM auth.users LIMIT 1)
);

-- Create views for reporting
CREATE OR REPLACE VIEW delivery_summary AS
SELECT 
    COUNT(*) as total_deliveries,
    SUM(quantity_liters) as total_volume,
    SUM(isse_vurra_cdf) as total_payments_cdf,
    SUM(isse_vurra_usd) as total_payments_usd,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deliveries,
    COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_deliveries
FROM fuel_deliveries;

CREATE OR REPLACE VIEW transporter_performance AS
SELECT 
    t.transporter_name,
    t.transporter_code,
    COUNT(fd.id) as total_deliveries,
    SUM(fd.quantity_liters) as total_volume,
    SUM(fd.isse_vurra_cdf) as total_payments_cdf,
    SUM(fd.isse_vurra_usd) as total_payments_usd
FROM transporters t
LEFT JOIN fuel_deliveries fd ON t.id = fd.transporter_id
GROUP BY t.id, t.transporter_name, t.transporter_code;

-- Grant necessary permissions
GRANT ALL ON transporters TO authenticated;
GRANT ALL ON stations TO authenticated;
GRANT ALL ON fuel_deliveries TO authenticated;
GRANT ALL ON tax_payments TO authenticated;
GRANT ALL ON truck_transactions TO authenticated;
GRANT ALL ON fuel_stock TO authenticated;
GRANT SELECT ON delivery_summary TO authenticated;
GRANT SELECT ON transporter_performance TO authenticated;

-- Comments for documentation
COMMENT ON TABLE transporters IS 'Stores information about fuel transporters and truck operators';
COMMENT ON TABLE stations IS 'Stores information about fuel stations and storage facilities';
COMMENT ON TABLE fuel_deliveries IS 'Tracks fuel deliveries from transporters to stations';
COMMENT ON TABLE tax_payments IS 'Records tax payments made at border points';
COMMENT ON TABLE truck_transactions IS 'General transaction history for trucks and transporters';
COMMENT ON TABLE fuel_stock IS 'Tracks current fuel stock levels at each station';
COMMENT ON VIEW delivery_summary IS 'Provides summary statistics for fuel deliveries';
COMMENT ON VIEW transporter_performance IS 'Shows performance metrics for each transporter';










