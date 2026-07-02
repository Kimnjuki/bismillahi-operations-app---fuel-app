const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bdjoknphffficrepbxim.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc1NjkwOSwiZXhwIjoyMDk2MzMyOTA5fQ.BFTerJBy-LcLWeN6nDb0xhjHt9nHgSb-LMvN-91duFA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('🔧 Attempting to fix pumps table schema...\n');

    const sqlToRun = `ALTER TABLE IF EXISTS public.pumps 
        ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'PMS',
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_by UUID,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;

    // Try exec_sql with different parameter signatures
    const paramSignatures = [
      { sql_text: sqlToRun },
      { sql: sqlToRun },
      { query: sqlToRun },
      { query_text: sqlToRun },
      { p_sql: sqlToRun },
      { command: sqlToRun }
    ];

    for (const params of paramSignatures) {
      const paramName = Object.keys(params)[0];
      try {
        const { data, error } = await supabase.rpc('exec_sql', params);
        if (error) {
          if (error.message?.includes('function') || error.message?.includes('Could not find')) {
            continue;
          }
          console.log(`❌ exec_sql(${paramName}): ${error.message.substring(0, 100)}`);
        } else {
          console.log(`✅ Success with exec_sql(${paramName}):`, JSON.stringify(data));
          console.log('\n🔍 Verifying...');
          await verifyColumns();
          return;
        }
      } catch (e) {
        // skip
      }
    }

    // Try creating the function by calling a raw function if it exists
    console.log('\n📝 exec_sql function not found. Let me try creating it first...');
    
    // Try to create via a raw query approach
    const createFnSql = `CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; RETURN jsonb_build_object('success', true); EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE); END; $$;`;
    
    // Since we can't create functions via REST, check if the user can grant us access
    console.log('⚠️  Manual SQL execution required.');
    console.log('\nPlease run this in your Supabase SQL Editor:\n');
    
    const fullSql = `-- 1. Create helper function (if not exists)
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
    EXECUTE sql;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
\$\$;

-- 2. Add missing columns to pumps table
${sqlToRun};

-- 3. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';`;

    console.log(fullSql);
    
    const fs = require('fs');
    fs.writeFileSync('database/fix-pumps-table.sql', fullSql);
    console.log('\n✅ SQL saved to database/fix-pumps-table.sql');
    console.log('Please copy and paste the SQL above into your Supabase SQL Editor and run it.');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

async function verifyColumns() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    'https://bdjoknphffficrepbxim.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY5MDksImV4cCI6MjA5NjMzMjkwOX0.pjavkvr6QlJhkIi3MGfqd1ayFFvOIzsEsNFUkzzqA78'
  );
  
  const cols = ['id', 'name', 'pump_number', 'fuel_type', 'station_id', 'is_active', 'created_by', 'created_at'];
  for (const col of cols) {
    const { error } = await supabase.from('pumps').select(col).limit(1);
    console.log(`  ${error ? '❌' : '✅'} ${col}`);
  }
}

main();