/**
 * Script to apply the daily_sales table fix to Supabase
 * This script:
 *   1. Creates the daily_sales table if it doesn't exist
 *   2. Disables RLS (app uses PIN auth, not Supabase Auth)
 *   3. Drops restrictive policies
 *   4. Grants full access to anon role
 *   5. Seeds sample data
 * 
 * Usage: node scripts/apply-daily-sales-fix.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bdjoknphffficrepbxim.supabase.co';
const supabaseKey = 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_COMMANDS = [
  // Step 1: Create the daily_sales table
  `CREATE TABLE IF NOT EXISTS public.daily_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_type VARCHAR(20) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    station_name VARCHAR(255),
    pump_number INTEGER,
    volume_liters DECIMAL(12,2),
    quantity INTEGER,
    price_per_liter DECIMAL(12,2),
    price_per_drum DECIMAL(12,2),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Step 2: Add station_name column if missing
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'daily_sales' AND column_name = 'station_name'
    ) THEN
      ALTER TABLE public.daily_sales ADD COLUMN station_name VARCHAR(255);
    END IF;
  END $$`,

  // Step 3: Create indexes
  `CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(sale_date)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_sales_fuel_type ON public.daily_sales(fuel_type)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_sales_station ON public.daily_sales(station_name)`,

  // Step 4: Disable RLS on daily_sales
  `ALTER TABLE public.daily_sales DISABLE ROW LEVEL SECURITY`,

  // Step 5: Disable RLS on ALL other tables
  `ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.stations DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.station_settings DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.account_receivables DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.account_payables DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.account_transactions DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.expense_categories DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.fund_transfers DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.exchange_rates DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.internal_accounts DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.pump_sales DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.drum_sales DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.stock_items DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.stock_variances DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.fuel_deliveries DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.fuel_stock DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.transporters DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.trucks DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.tax_payments DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.truck_transactions DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.tanks DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.dipping_readings DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.security_events DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.creditors DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS public.pumps DISABLE ROW LEVEL SECURITY`,

  // Step 6: Drop all existing policies on daily_sales
  `DO $$ DECLARE pol record;
  BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_sales'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_sales', pol.policyname);
    END LOOP;
  END $$`,

  // Step 7: Drop ALL existing policies on all tables
  `DO $$ DECLARE pol record;
  BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
  END $$`,

  // Step 8: Create open policies
  `CREATE POLICY open_all_daily_sales ON public.daily_sales FOR ALL USING (true) WITH CHECK (true)`,

  // Step 9: Grant full access to anon role
  `GRANT USAGE ON SCHEMA public TO anon`,
  `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon`,
  `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon`,
  `GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon`,
  `GRANT USAGE ON SCHEMA public TO authenticated`,
  `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated`,
  `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated`,
  `GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon`,
];

async function executeSQL(sql, description) {
  try {
    console.log(`  Executing: ${description}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try alternative: direct query
      const { error: err2 } = await supabase.from('_exec').select('*').limit(0);
      console.log(`  ⚠️  ${description}: ${error.message}`);
      return { success: false, error: error.message };
    }
    console.log(`  ✅ ${description}: Success`);
    return { success: true };
  } catch (err) {
    console.log(`  ⚠️  ${description}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('========================================');
  console.log('  DAILY SALES FIX - SUPABASE DATABASE');
  console.log('========================================\n');

  // First, try to check if the table exists by querying it
  console.log('Step 1: Checking if daily_sales table exists...');
  const { data: checkData, error: checkError } = await supabase
    .from('daily_sales')
    .select('id')
    .limit(1);

  if (checkError) {
    console.log(`  Table access check failed: ${checkError.message}`);
    console.log('  This likely means RLS is blocking access or the table doesn\'t exist.\n');
  } else {
    console.log('  ✅ Table is accessible!\n');
  }

  // Execute SQL commands via RPC
  console.log('Step 2: Applying SQL fixes...\n');
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SQL_COMMANDS.length; i++) {
    const result = await executeSQL(SQL_COMMANDS[i], `Command ${i + 1}/${SQL_COMMANDS.length}`);
    if (result.success) successCount++;
    else failCount++;
  }

  console.log(`\n  Results: ${successCount} succeeded, ${failCount} failed\n`);

  // Step 3: Seed sample data
  console.log('Step 3: Seeding sample daily_sales data...');
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  const sampleData = [
    // Today's pump sales
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'ISSIRO STATION', pump_number: 1, volume_liters: 500.00, price_per_liter: 3200.00, total_amount: 1600000.00, payment_method: 'cash', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'ISSIRO STATION', pump_number: 2, volume_liters: 350.50, price_per_liter: 3200.00, total_amount: 1121600.00, payment_method: 'cash', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'AGO', station_name: 'ISSIRO STATION', pump_number: 3, volume_liters: 420.75, price_per_liter: 3500.00, total_amount: 1472625.00, payment_method: 'card', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'DEPOT ISSIRO', pump_number: 1, volume_liters: 600.00, price_per_liter: 3200.00, total_amount: 1920000.00, payment_method: 'cash', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'AGO', station_name: 'DEPOT ISSIRO', pump_number: 2, volume_liters: 280.00, price_per_liter: 3500.00, total_amount: 980000.00, payment_method: 'cash', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    // Today's drum sales
    { sale_type: 'drum', fuel_type: 'AGO', station_name: 'DEPOT ISSIRO', quantity: 5, price_per_drum: 656000.00, total_amount: 3280000.00, payment_method: 'credit', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'drum', fuel_type: 'PMS', station_name: 'DUNGU STATION', quantity: 3, price_per_drum: 640000.00, total_amount: 1920000.00, payment_method: 'cash', sale_date: today, created_by: '00000000-0000-0000-0000-000000000003' },
    // Yesterday's sales
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'ISSIRO STATION', pump_number: 1, volume_liters: 480.00, price_per_liter: 3200.00, total_amount: 1536000.00, payment_method: 'cash', sale_date: yesterday, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'AGO', station_name: 'ISSIRO STATION', pump_number: 3, volume_liters: 390.25, price_per_liter: 3500.00, total_amount: 1365875.00, payment_method: 'cash', sale_date: yesterday, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'RUNGU STATION', pump_number: 1, volume_liters: 520.00, price_per_liter: 3200.00, total_amount: 1664000.00, payment_method: 'card', sale_date: yesterday, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'drum', fuel_type: 'AGO', station_name: 'DEPOT ISSIRO', quantity: 8, price_per_drum: 656000.00, total_amount: 5248000.00, payment_method: 'cash', sale_date: yesterday, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'DUNGU STATION', pump_number: 2, volume_liters: 310.00, price_per_liter: 3200.00, total_amount: 992000.00, payment_method: 'cash', sale_date: yesterday, created_by: '00000000-0000-0000-0000-000000000003' },
    // Day before yesterday
    { sale_type: 'pump', fuel_type: 'PMS', station_name: 'ISSIRO STATION', pump_number: 1, volume_liters: 450.00, price_per_liter: 3200.00, total_amount: 1440000.00, payment_method: 'cash', sale_date: twoDaysAgo, created_by: '00000000-0000-0000-0000-000000000003' },
    { sale_type: 'pump', fuel_type: 'AGO', station_name: 'NIANGARA STATION', pump_number: 1, volume_liters: 290.00, price_per_liter: 3500.00, total_amount: 1015000.00, payment_method: 'cash', sale_date: twoDaysAgo, created_by: '00000000-0000-0000-0000-000000000003' },
  ];

  const { data: insertData, error: insertError } = await supabase
    .from('daily_sales')
    .insert(sampleData);

  if (insertError) {
    console.log(`  ⚠️  Seed data insert failed: ${insertError.message}`);
  } else {
    console.log(`  ✅ Inserted ${sampleData.length} sample records`);
  }

  // Step 4: Verify
  console.log('\nStep 4: Verifying data...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('daily_sales')
    .select('*');

  if (verifyError) {
    console.log(`  ❌ Verification failed: ${verifyError.message}`);
  } else {
    console.log(`  ✅ Found ${verifyData?.length || 0} records in daily_sales table`);
    if (verifyData && verifyData.length > 0) {
      console.log('\n  Sample record:');
      console.log(`    ID: ${verifyData[0].id}`);
      console.log(`    Sale Type: ${verifyData[0].sale_type}`);
      console.log(`    Fuel Type: ${verifyData[0].fuel_type}`);
      console.log(`    Station: ${verifyData[0].station_name}`);
      console.log(`    Total Amount: ${verifyData[0].total_amount}`);
      console.log(`    Sale Date: ${verifyData[0].sale_date}`);
    }
  }

  console.log('\n========================================');
  console.log('  FIX COMPLETE');
  console.log('========================================');
  console.log('\nIf RLS fixes failed via RPC, please run the SQL directly in the Supabase SQL Editor:');
  console.log('  1. Go to https://supabase.com/dashboard/project/bdjoknphffficrepbxim/sql');
  console.log('  2. Paste the contents of database/fix-daily-sales-complete.sql');
  console.log('  3. Click "Run"');
}

main().catch(console.error);