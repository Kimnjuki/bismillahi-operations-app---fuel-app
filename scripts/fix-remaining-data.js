const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function execSql(sql) {
  await supabase.rpc('exec_sql', { sql: 'NOTIFY pgrst, \'reload schema\';' });
  await new Promise(r => setTimeout(r, 1000));
  const { error } = await supabase.rpc('exec_sql', { sql });
  return { error };
}

async function main() {
  console.log('=== Fix remaining seeded data ===\n');

  // Reload schema cache
  console.log('Reloading schema...');
  await supabase.rpc('exec_sql', { sql: 'NOTIFY pgrst, \'reload schema\';' });
  await new Promise(r => setTimeout(r, 2000));

  // Fix account_receivables
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `INSERT INTO public.account_receivables (creditor_name, creditor_code, total_amount, currency, due_date, status, description) VALUES ('Congo Fuel Supply Ltd', 'CFS001', 5000000, 'CDF', '2026-07-15', 'pending', 'Fuel supply payment'), ('Kinshasa Equipment Co', 'KEC002', 2500, 'USD', '2026-07-20', 'overdue', 'Equipment maintenance'), ('Issiro General Suppliers', 'IGS003', 3000000, 'CDF', '2026-08-01', 'pending', 'Station supplies');`
  });
  console.log(`account_receivables: ${e1 ? e1.message : 'OK'}`);

  // Fix account_payables
  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: `INSERT INTO public.account_payables (debtor_name, debtor_code, total_amount, currency, due_date, status, description) VALUES ('Rungu Transport Services', 'RTS001', 2000000, 'CDF', '2026-07-18', 'pending', 'Fuel delivery payment'), ('Dungu Petroleum Dealers', 'DPD002', 1500, 'USD', '2026-07-22', 'overdue', 'Service charges');`
  });
  console.log(`account_payables: ${e2 ? e2.message : 'OK'}`);

  // Fix users - insert with email
  const { error: e3 } = await supabase.rpc('exec_sql', {
    sql: `INSERT INTO public.users (email, full_name, role, is_active, user_code) VALUES ('admin@bismillahi.com', 'Admin User', 'admin', true, 'A001'), ('manager@bismillahi.com', 'Manager User', 'manager', true, 'A002'), ('cashier@bismillahi.com', 'Cashier User', 'cashier', true, 'A003'), ('viewer@bismillahi.com', 'Viewer User', 'viewer', true, 'A004');`
  });
  console.log(`users: ${e3 ? e3.message : 'OK'}`);

  // Verify counts
  console.log('\n=== Final Counts ===');
  const tables = ['users', 'stations', 'account_receivables', 'account_payables', 'expenses', 'fund_transfers', 'exchange_rates', 'internal_accounts', 'pump_sales', 'drum_sales'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count || 0} rows`);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);