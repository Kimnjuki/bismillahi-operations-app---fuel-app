const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function main() {
  console.log('=== Checking and seeding account tables ===\n');

  // Test minimal insert
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: "INSERT INTO public.account_receivables (total_amount, currency, due_date, status, description, creditor_name, creditor_code) VALUES (100, 'CDF', '2026-12-01', 'pending', 'test', 'Test', 'TEST001')"
  });
  console.log('AR test insert:', e1 ? e1.message : 'OK');

  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: "INSERT INTO public.account_payables (total_amount, currency, due_date, status, description, debtor_name, debtor_code) VALUES (100, 'CDF', '2026-12-01', 'pending', 'test', 'Test', 'TEST001')"
  });
  console.log('AP test insert:', e2 ? e2.message : 'OK');

  // Read back to see columns
  const { data: d1 } = await supabase.from('account_receivables').select('*').limit(5);
  console.log('\nAR columns:', d1 && d1.length > 0 ? Object.keys(d1[0]).join(', ') : 'empty');
  console.log('AR rows:', d1?.length || 0);

  const { data: d2 } = await supabase.from('account_payables').select('*').limit(5);
  console.log('AP columns:', d2 && d2.length > 0 ? Object.keys(d2[0]).join(', ') : 'empty');
  console.log('AP rows:', d2?.length || 0);

  // Clean test data and insert real data
  await supabase.rpc('exec_sql', { sql: "DELETE FROM public.account_receivables WHERE creditor_code = 'TEST001'" });
  await supabase.rpc('exec_sql', { sql: "DELETE FROM public.account_payables WHERE debtor_code = 'TEST001'" });

  // Seed account_receivables
  const arData = [
    { creditor_name: 'Congo Fuel Supply Ltd', creditor_code: 'CFS001', total_amount: 5000000, currency: 'CDF', due_date: '2026-07-15', status: 'pending', description: 'Fuel supply payment' },
    { creditor_name: 'Kinshasa Equipment Co', creditor_code: 'KEC002', total_amount: 2500, currency: 'USD', due_date: '2026-07-20', status: 'overdue', description: 'Equipment maintenance' },
    { creditor_name: 'Issiro General Suppliers', creditor_code: 'IGS003', total_amount: 3000000, currency: 'CDF', due_date: '2026-08-01', status: 'pending', description: 'Station supplies' },
  ];
  const { error: arErr } = await supabase.from('account_receivables').insert(arData);
  console.log('\nAR seed:', arErr ? arErr.message : `${arData.length} rows`);

  // Seed account_payables
  const apData = [
    { debtor_name: 'Rungu Transport Services', debtor_code: 'RTS001', total_amount: 2000000, currency: 'CDF', due_date: '2026-07-18', status: 'pending', description: 'Fuel delivery payment' },
    { debtor_name: 'Dungu Petroleum Dealers', debtor_code: 'DPD002', total_amount: 1500, currency: 'USD', due_date: '2026-07-22', status: 'overdue', description: 'Service charges' },
  ];
  const { error: apErr } = await supabase.from('account_payables').insert(apData);
  console.log('AP seed:', apErr ? apErr.message : `${apData.length} rows`);

  // Final counts
  console.log('\n=== FINAL COUNTS ===');
  const tables = ['users', 'stations', 'account_receivables', 'account_payables', 'expenses', 'fund_transfers', 'exchange_rates', 'internal_accounts', 'pump_sales', 'drum_sales'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} ${t}: ${count || 0} rows`);
  }
}

main().catch(console.error);