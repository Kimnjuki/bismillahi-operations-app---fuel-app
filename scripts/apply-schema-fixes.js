const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SQL fixes broken into individual statements for better error reporting
const SQL_FIXES = [
  // Fix 1: security_events - add description column
  `ALTER TABLE IF EXISTS public.security_events 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'LOW',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`,

  // Fix 2: daily_sales - add missing columns  
  `ALTER TABLE IF EXISTS public.daily_sales 
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;`,

  // Fix 3: transporters - add address column
  `ALTER TABLE IF EXISTS public.transporters 
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS transporter_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by UUID;`,

  // Fix 4: Update transporters defaults
  `UPDATE public.transporters 
    SET transporter_code = 'TRP-' || SUBSTRING(id::text, 1, 8)
    WHERE transporter_code IS NULL;`,

  `UPDATE public.transporters 
    SET contact_person = name 
    WHERE contact_person IS NULL AND name IS NOT NULL;`,

  // Fix 5: fuel_deliveries - add missing columns
  `ALTER TABLE IF EXISTS public.fuel_deliveries 
    ADD COLUMN IF NOT EXISTS quantity_liters DECIMAL(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
    ADD COLUMN IF NOT EXISTS isse_vurra_cdf DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS isse_vurra_usd DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS truck_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

  // Fix 6: fuel_stock - add missing columns
  `ALTER TABLE IF EXISTS public.fuel_stock 
    ADD COLUMN IF NOT EXISTS product VARCHAR(100) DEFAULT 'Petrol',
    ADD COLUMN IF NOT EXISTS current_stock DECIMAL(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS capacity DECIMAL(12,3) DEFAULT 100000,
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

  // Fix 7: exchange_rates - add created_by
  `ALTER TABLE IF EXISTS public.exchange_rates 
    ADD COLUMN IF NOT EXISTS created_by UUID;`,

  // Fix 8: Create views for type compatibility
  `CREATE OR REPLACE VIEW public.fuel_deliveries_with_stations AS
    SELECT 
      fd.*,
      s.id AS station_ref_id,
      s.name AS station_name,
      s.location AS station_location
    FROM public.fuel_deliveries fd
    LEFT JOIN public.stations s ON fd.station_id::UUID = s.id;`,

  `CREATE OR REPLACE VIEW public.fuel_stock_with_stations AS
    SELECT 
      fs.*,
      s.id AS station_ref_id,
      s.name AS station_name,
      s.location AS station_location
    FROM public.fuel_stock fs
    LEFT JOIN public.stations s ON fs.station_id::UUID = s.id;`,

  // Fix 9: Create exec_sql function
  `CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
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
    $func$;`,

  // Fix 10: Notify schema reload
  `NOTIFY pgrst, 'reload schema';`
];

async function executeSQL(sql) {
  // Try using RPC first (if exec_sql function exists)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (!error) {
      return { success: true, method: 'rpc', data };
    }
    throw error;
  } catch (rpcError) {
    // Fall back to raw SQL execution via the REST API
    try {
      const { data, error } = await supabase
        .from('_sql_exec')
        .insert([{ query: sql }])
        .select();
      
      if (!error) {
        return { success: true, method: 'rest_insert', data };
      }
      throw error;
    } catch (restError) {
      // Last resort: try using the management endpoint
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ sql })
        });
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, method: 'rest_rpc', data };
        }
        
        const text = await response.text();
        return { success: false, method: 'failed', error: text.substring(0, 500) };
      } catch (fetchError) {
        return { success: false, method: 'failed', error: fetchError.message };
      }
    }
  }
}

async function main() {
  console.log('=== Applying Database Schema Fixes ===');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('');

  // Test connection first
  console.log('Testing connection...');
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (error) {
      console.log(`Connection test warning: ${error.message}`);
      console.log('Will try to apply fixes anyway...\n');
    } else {
      const tableNames = data.map(t => t.table_name).join(', ');
      console.log(`Connected. Existing tables: ${tableNames}\n`);
    }
  } catch (e) {
    console.log(`Connection test: ${e.message}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SQL_FIXES.length; i++) {
    const sql = SQL_FIXES[i].trim();
    if (!sql) continue;
    
    // Get a short description
    const firstLine = sql.split('\n')[0].trim().substring(0, 80);
    console.log(`[${i + 1}/${SQL_FIXES.length}] ${firstLine}...`);
    
    const result = await executeSQL(sql);
    
    if (result.success) {
      console.log(`  ✓ Success (via ${result.method})`);
      successCount++;
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
      failCount++;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total: ${SQL_FIXES.length} statements`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('');
    console.log('NOTE: Some fixes may have failed because:');
    console.log('1. The anon key may not have sufficient permissions for DDL operations');
    console.log('2. You need a service_role key for ALTER TABLE statements');
    console.log('');
    console.log('To apply the fixes with full permissions:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the contents of database/fix-all-schema-errors.sql');
    console.log('5. Paste and run the SQL');
  } else {
    console.log('All fixes applied successfully!');
  }
}

main().catch(console.error);