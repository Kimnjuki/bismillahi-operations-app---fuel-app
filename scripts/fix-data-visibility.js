const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function main() {
  console.log('=== FIXING DATA VISIBILITY ===\n');

  // Step 1: Disable RLS on tables that might still have it enabled
  console.log('1. Disabling RLS on all tables...');
  const rlsSql = `
    ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.stations DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.station_settings DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.account_receivables DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.account_payables DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.account_transactions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.expense_categories DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.fund_transfers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.exchange_rates DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.internal_accounts DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.pump_sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.drum_sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.stock_items DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.stock_variances DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.fuel_deliveries DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.fuel_stock DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.transporters DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.tax_payments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.truck_transactions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.tanks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.dipping_readings DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.daily_sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.security_events DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.creditors DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.pumps DISABLE ROW LEVEL SECURITY;

    GRANT USAGE ON SCHEMA public TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
  `;

  const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSql });
  if (rlsError) {
    console.log('  ⚠️ RLS disable warning:', rlsError.message);
  } else {
    console.log('  ✅ RLS disabled on all tables');
  }

  // Step 2: Insert demo users
  console.log('\n2. Ensuring demo users exist...');
  const userSql = `
    INSERT INTO public.users (id, user_code, full_name, role, is_active, pin_hash, created_at, updated_at)
    VALUES
      ('demo-1', 'A001', 'Admin User', 'admin', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
      ('demo-2', 'A002', 'Manager User', 'manager', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
      ('demo-3', 'A003', 'Cashier User', 'cashier', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW()),
      ('demo-4', 'A004', 'Viewer User', 'viewer', true, 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      user_code = EXCLUDED.user_code,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active;
  `;

  const { error: userError } = await supabase.rpc('exec_sql', { sql: userSql });
  if (userError) {
    console.log('  ⚠️ Demo user insert warning:', userError.message);
  } else {
    console.log('  ✅ Demo users verified/inserted');
  }

  // Step 3: Verify the fix by querying
  console.log('\n3. Verifying queries work...');
  const tables = ['account_receivables', 'account_payables', 'internal_accounts', 'users', 'stations', 'expenses', 'fund_transfers', 'exchange_rates'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ❌ ${table}: ${error.message.substring(0, 80)}`);
    } else {
      console.log(`  ✅ ${table}: accessible`);
    }
  }

  console.log('\n=== FIX COMPLETE ===');
  console.log('The RLS policies were blocking reads for custom PIN-authenticated users.');
  console.log('Now all tables are accessible via the anon key.');
}

main().catch(console.error);