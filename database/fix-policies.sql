-- Fix Database Policies Script
-- This script fixes the infinite recursion issues in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

-- Drop policies on other tables that reference users
DROP POLICY IF EXISTS "Users can view all stock_items" ON stock_items;
DROP POLICY IF EXISTS "Users can insert stock_items" ON stock_items;
DROP POLICY IF EXISTS "Users can update stock_items" ON stock_items;
DROP POLICY IF EXISTS "Users can delete stock_items" ON stock_items;

DROP POLICY IF EXISTS "Users can view all exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can insert exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can update exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can delete exchange_rates" ON exchange_rates;

-- Create new, simpler policies for users table
CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on email" ON users
    FOR UPDATE USING (auth.email() = email);

CREATE POLICY "Enable delete for users based on email" ON users
    FOR DELETE USING (auth.email() = email);

-- Create new policies for stock_items
CREATE POLICY "Enable read access for all users" ON stock_items
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON stock_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON stock_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON stock_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create new policies for exchange_rates
CREATE POLICY "Enable read access for all users" ON exchange_rates
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON exchange_rates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON exchange_rates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON exchange_rates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for fuel delivery tables if they don't exist
DO $$
BEGIN
    -- Check if fuel delivery tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transporters') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all transporters" ON transporters;
        DROP POLICY IF EXISTS "Users can insert transporters" ON transporters;
        DROP POLICY IF EXISTS "Users can update transporters" ON transporters;
        DROP POLICY IF EXISTS "Users can delete transporters" ON transporters;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON transporters
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON transporters
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON transporters
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON transporters
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stations') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all stations" ON stations;
        DROP POLICY IF EXISTS "Users can insert stations" ON stations;
        DROP POLICY IF EXISTS "Users can update stations" ON stations;
        DROP POLICY IF EXISTS "Users can delete stations" ON stations;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON stations
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON stations
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON stations
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON stations
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_deliveries') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all fuel deliveries" ON fuel_deliveries;
        DROP POLICY IF EXISTS "Users can insert fuel deliveries" ON fuel_deliveries;
        DROP POLICY IF EXISTS "Users can update fuel deliveries" ON fuel_deliveries;
        DROP POLICY IF EXISTS "Users can delete fuel deliveries" ON fuel_deliveries;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON fuel_deliveries
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON fuel_deliveries
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON fuel_deliveries
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON fuel_deliveries
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_payments') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all tax payments" ON tax_payments;
        DROP POLICY IF EXISTS "Users can insert tax payments" ON tax_payments;
        DROP POLICY IF EXISTS "Users can update tax payments" ON tax_payments;
        DROP POLICY IF EXISTS "Users can delete tax payments" ON tax_payments;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON tax_payments
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON tax_payments
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON tax_payments
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON tax_payments
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'truck_transactions') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all truck transactions" ON truck_transactions;
        DROP POLICY IF EXISTS "Users can insert truck transactions" ON truck_transactions;
        DROP POLICY IF EXISTS "Users can update truck transactions" ON truck_transactions;
        DROP POLICY IF EXISTS "Users can delete truck transactions" ON truck_transactions;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON truck_transactions
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON truck_transactions
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON truck_transactions
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON truck_transactions
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_stock') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all fuel stock" ON fuel_stock;
        DROP POLICY IF EXISTS "Users can insert fuel stock" ON fuel_stock;
        DROP POLICY IF EXISTS "Users can update fuel stock" ON fuel_stock;
        DROP POLICY IF EXISTS "Users can delete fuel stock" ON fuel_stock;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON fuel_stock
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON fuel_stock
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON fuel_stock
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON fuel_stock
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create policies for account tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_receivables') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all account receivables" ON account_receivables;
        DROP POLICY IF EXISTS "Users can insert account receivables" ON account_receivables;
        DROP POLICY IF EXISTS "Users can update account receivables" ON account_receivables;
        DROP POLICY IF EXISTS "Users can delete account receivables" ON account_receivables;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON account_receivables
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON account_receivables
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON account_receivables
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON account_receivables
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_payables') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all account payables" ON account_payables;
        DROP POLICY IF EXISTS "Users can insert account payables" ON account_payables;
        DROP POLICY IF EXISTS "Users can update account payables" ON account_payables;
        DROP POLICY IF EXISTS "Users can delete account payables" ON account_payables;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON account_payables
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON account_payables
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON account_payables
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON account_payables
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_transactions') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view all account transactions" ON account_transactions;
        DROP POLICY IF EXISTS "Users can insert account transactions" ON account_transactions;
        DROP POLICY IF EXISTS "Users can update account transactions" ON account_transactions;
        DROP POLICY IF EXISTS "Users can delete account transactions" ON account_transactions;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON account_transactions
            FOR SELECT USING (true);
        
        CREATE POLICY "Enable insert for authenticated users only" ON account_transactions
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update for authenticated users only" ON account_transactions
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete for authenticated users only" ON account_transactions
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON exchange_rates TO authenticated;

-- Grant permissions for fuel delivery tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transporters') THEN
        GRANT ALL ON transporters TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stations') THEN
        GRANT ALL ON stations TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_deliveries') THEN
        GRANT ALL ON fuel_deliveries TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_payments') THEN
        GRANT ALL ON tax_payments TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'truck_transactions') THEN
        GRANT ALL ON truck_transactions TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_stock') THEN
        GRANT ALL ON fuel_stock TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_receivables') THEN
        GRANT ALL ON account_receivables TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_payables') THEN
        GRANT ALL ON account_payables TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_transactions') THEN
        GRANT ALL ON account_transactions TO authenticated;
    END IF;
END $$;










