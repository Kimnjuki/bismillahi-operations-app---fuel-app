const { createClient } = require('@supabase/supabase-js');

// ============================================================
// CONFIGURATION - Update these values
// ============================================================
const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBiemltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY4MzE3OSwiZXhwIjoyMDczMjU5MTc5fQ.placeholder'; // <<< REPLACE with actual service_role key from Supabase Dashboard

// First try with service key (or anon key as fallback)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// SQL FIXES - All fixes in one place
// ============================================================
const SQL_FIXES = `
-- =============================================================
-- COMPREHENSIVE SCHEMA FIX SCRIPT
-- Fixes all errors from application logs
-- =============================================================

-- 0. Fix stations: Add station_code, station_name, name, system_type, usd_support columns
ALTER TABLE IF EXISTS public.stations 
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS station_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS station_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS system_type VARCHAR(50) DEFAULT 'pump',
  ADD COLUMN IF NOT EXISTS usd_support BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacity_liters NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.stations SET name = station_name WHERE name IS NULL AND station_name IS NOT NULL;
UPDATE public.stations SET station_name = name WHERE station_name IS NULL AND name IS NOT NULL;

-- 1. Fix security_events: Add description column
ALTER TABLE IF EXISTS public.security_events 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Fix daily_sales: Add created_by and other missing columns
ALTER TABLE IF EXISTS public.daily_sales 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;

-- 3. Fix transporters: Add address and missing columns  
ALTER TABLE IF EXISTS public.transporters 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS transporter_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_by UUID;

UPDATE public.transporters 
  SET transporter_code = 'TRP-' || SUBSTRING(id::text, 1, 8)
  WHERE transporter_code IS NULL;

UPDATE public.transporters 
  SET contact_person = name 
  WHERE contact_person IS NULL AND name IS NOT NULL;

-- 4. Fix fuel_deliveries: Add missing columns
ALTER TABLE IF EXISTS public.fuel_deliveries 
  ADD COLUMN IF NOT EXISTS quantity_liters DECIMAL(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
  ADD COLUMN IF NOT EXISTS isse_vurra_cdf DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS isse_vurra_usd DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS truck_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Fix fuel_stock: Add missing columns
ALTER TABLE IF EXISTS public.fuel_stock 
  ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
  ADD COLUMN IF NOT EXISTS current_stock DECIMAL(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity DECIMAL(12,3) DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Fix exchange_rates: Add created_by
ALTER TABLE IF EXISTS public.exchange_rates 
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 7. Create exec_sql function for future SQL executions
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$func$;

-- 8. Refresh schema cache
NOTIFY pgrst, 'reload schema';
`;

// ============================================================
// Test queries to verify fixes
// ============================================================
const TEST_TABLES = [
  'security_events', 'daily_sales', 'transporters', 
  'fuel_deliveries', 'fuel_stock', 'exchange_rates',
  'users', 'stations'
];

async function testTableAccess(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { table: tableName, status: '✗ ERROR', details: error.message.substring(0, 100) };
    }
    return { table: tableName, status: '✓ OK', details: `accessible` };
  } catch (e) {
    return { table: tableName, status: '✗ ERROR', details: e.message.substring(0, 100) };
  }
}

async function main() {
  console.log('========================================');
  console.log('  BISMILLAHI OPERATIONS - SCHEMA FIXES');
  console.log('========================================\n');

  // Step 1: Test current state
  console.log('📊 CURRENT DATABASE STATE:\n');
  console.log('Testing table accessibility...\n');
  
  const results = [];
  for (const table of TEST_TABLES) {
    const result = await testTableAccess(table);
    console.log(`  ${result.status} ${result.table}: ${result.details}`);
    results.push(result);
  }

  const errors = results.filter(r => r.status === '✗ ERROR');
  if (errors.length > 0) {
    console.log(`\n⚠️  Found ${errors.length} tables with issues that need fixing.\n`);
  } else {
    console.log('\n✅ All tables are accessible.\n');
  }

  // Step 2: Instructions
  console.log('========================================');
  console.log('  APPLYING FIXES');
  console.log('========================================\n');
  
  console.log('The exec_sql function does not exist in the database yet.');
  console.log('This means we need to use the Supabase Dashboard SQL Editor.\n');
  
  console.log('📋 MANUAL STEPS:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project (bdjoknphffficrepbxim)');
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Paste the SQL below into the editor');
  console.log('6. Click "Run" to execute\n');
  
  console.log('========================================');
  console.log('  SQL TO EXECUTE:');
  console.log('========================================\n');
  console.log(SQL_FIXES);
  console.log('========================================\n');

  // Step 3: Check if we can use the Supabase Management API
  console.log('📡 Checking if Supabase Management API is accessible...');
  try {
    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (mgmtResponse.ok) {
      console.log('✅ Management API accessible!');
      
      // Try to execute SQL via management API
      const sqlResponse = await fetch(
        `https://api.supabase.com/v1/projects/bdjoknphffficrepbxim/sql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: SQL_FIXES })
        }
      );
      
      if (sqlResponse.ok) {
        const result = await sqlResponse.json();
        console.log('✅ SQL executed successfully via Management API!');
        console.log('Result:', JSON.stringify(result).substring(0, 200));
      } else {
        const errText = await sqlResponse.text();
        console.log(`⚠️  Management API SQL execution failed: ${errText.substring(0, 200)}`);
        console.log('(This requires a valid management API access token)');
      }
    } else {
      console.log('⚠️  Management API not accessible with anon key');
    }
  } catch (e) {
    console.log(`⚠️  Management API error: ${e.message}`);
  }

  console.log('\n✅ Instructions ready. Please execute the SQL above via Supabase Dashboard.\n');
  console.log('TIP: You can also copy the SQL from database/fix-all-schema-errors.sql file.');
}

main().catch(console.error);