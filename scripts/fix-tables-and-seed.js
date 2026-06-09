const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function main() {
  // Create a function that returns query results
  console.log('Creating query helper...');
  await supabase.rpc('exec_sql', {
    sql: `CREATE OR REPLACE FUNCTION public.query_sql(sql TEXT)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;`
  });

  // Query table structures
  const tables = ['account_receivables', 'account_payables', 'expenses', 'fund_transfers', 'internal_accounts', 'users'];
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('query_sql', {
      sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' AND table_schema = 'public' ORDER BY ordinal_position`
    });
    
    if (error) {
      console.log(`\n❌ ${table}: ${error.message}`);
    } else if (data && Array.isArray(data)) {
      console.log(`\n📋 ${table} (${data.length} columns):`);
      for (const col of data) {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''}`);
      }
    }
  }

  // Now check what columns PostgREST sees (from schema cache)
  console.log('\n\n📋 PostgREST schema check:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        console.log(`  ❌ ${table}: ${error.message.substring(0, 80)}`);
      } else {
        console.log(`  ✅ ${table}: OK`);
      }
    } catch (e) {
      console.log(`  ❌ ${table}: ${e.message.substring(0, 80)}`);
    }
  }

  // Now create correct tables and seed data
  console.log('\n\n🔧 Creating correct table schemas...');

  // Drop and recreate account_receivables
  const arSql = `
    DROP TABLE IF EXISTS public.account_receivables;
    CREATE TABLE public.account_receivables (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      creditor_name VARCHAR(255) NOT NULL,
      creditor_code VARCHAR(100) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      currency VARCHAR(3) DEFAULT 'CDF',
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      description TEXT,
      created_by VARCHAR(255),
      last_payment_date DATE,
      last_payment_amount NUMERIC(15,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: arSql });
  console.log(`  account_receivables: ${e1 ? e1.message : 'recreated'}`);

  // Drop and recreate account_payables
  const apSql = `
    DROP TABLE IF EXISTS public.account_payables;
    CREATE TABLE public.account_payables (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      debtor_name VARCHAR(255) NOT NULL,
      debtor_code VARCHAR(100) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      currency VARCHAR(3) DEFAULT 'CDF',
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      description TEXT,
      created_by VARCHAR(255),
      last_payment_date DATE,
      last_payment_amount NUMERIC(15,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  const { error: e2 } = await supabase.rpc('exec_sql', { sql: apSql });
  console.log(`  account_payables: ${e2 ? e2.message : 'recreated'}`);

  // Disable RLS
  await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.account_receivables DISABLE ROW LEVEL SECURITY;' });
  await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.account_payables DISABLE ROW LEVEL SECURITY;' });
  
  // Grant permissions
  await supabase.rpc('exec_sql', { sql: 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;' });

  // Reload schema
  await supabase.rpc('exec_sql', { sql: "NOTIFY pgrst, 'reload schema';" });
  await new Promise(r => setTimeout(r, 3000));

  // Now seed data
  console.log('\n📦 Seeding data...');
  
  const arData = [
    { creditor_name: 'Congo Fuel Supply Ltd', creditor_code: 'CFS001', total_amount: 5000000, currency: 'CDF', due_date: '2026-07-15', status: 'pending', description: 'Fuel supply payment' },
    { creditor_name: 'Kinshasa Equipment Co', creditor_code: 'KEC002', total_amount: 2500, currency: 'USD', due_date: '2026-07-20', status: 'overdue', description: 'Equipment maintenance' },
    { creditor_name: 'Issiro General Suppliers', creditor_code: 'IGS003', total_amount: 3000000, currency: 'CDF', due_date: '2026-08-01', status: 'pending', description: 'Station supplies' },
  ];
  const { error: arErr } = await supabase.from('account_receivables').insert(arData);
  console.log(`  account_receivables: ${arErr ? arErr.message : `${arData.length} rows inserted`}`);

  const apData = [
    { debtor_name: 'Rungu Transport Services', debtor_code: 'RTS001', total_amount: 2000000, currency: 'CDF', due_date: '2026-07-18', status: 'pending', description: 'Fuel delivery payment' },
    { debtor_name: 'Dungu Petroleum Dealers', debtor_code: 'DPD002', total_amount: 1500, currency: 'USD', due_date: '2026-07-22', status: 'overdue', description: 'Service charges' },
  ];
  const { error: apErr } = await supabase.from('account_payables').insert(apData);
  console.log(`  account_payables: ${apErr ? apErr.message : `${apData.length} rows inserted`}`);

  // Final verification
  console.log('\n📊 FINAL COUNTS:');
  const allTables = ['users', 'stations', 'account_receivables', 'account_payables', 'expenses', 'fund_transfers', 'exchange_rates', 'internal_accounts', 'pump_sales', 'drum_sales'];
  for (const t of allTables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} ${t}: ${count || 0} rows`);
  }
}

main().catch(console.error);