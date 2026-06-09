const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

let testId = 0;
function nextId() {
  testId++;
  return `test-${Date.now()}-${testId}`;
}

async function testTable(tableName, sampleData) {
  const id = nextId();
  console.log(`\n📋 Testing ${tableName}...`);
  
  // Step 1: INSERT
  const insertData = { ...sampleData, id };
  const { data: inserted, error: insertError } = await supabase
    .from(tableName)
    .insert([insertData])
    .select()
    .single();
  
  if (insertError) {
    console.log(`  ❌ INSERT failed: ${insertError.message.substring(0, 100)}`);
    return false;
  }
  console.log(`  ✅ INSERT successful: id=${inserted.id}`);

  // Step 2: SELECT (read)
  const { data: readData, error: readError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .single();
  
  if (readError) {
    console.log(`  ❌ SELECT failed: ${readError.message.substring(0, 100)}`);
    return false;
  }
  console.log(`  ✅ SELECT successful: found record`);
  
  // Step 3: SELECT ALL (list)
  const { data: allData, error: listError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: false })
    .limit(5);
  
  if (listError) {
    console.log(`  ❌ LIST failed: ${listError.message.substring(0, 100)}`);
    return false;
  }
  console.log(`  ✅ LIST successful: ${allData?.length || 0} records returned`);
  
  // Step 4: Clean up
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
  
  if (deleteError) {
    console.log(`  ⚠️ Cleanup warning: ${deleteError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Cleanup: test record deleted`);
  }
  
  return true;
}

async function main() {
  console.log('========================================');
  console.log('  COMPREHENSIVE DATA FLOW TEST');
  console.log('========================================\n');

  const results = [];

  // Test 1: Users table
  results.push({
    table: 'users',
    passed: await testTable('users', {
      user_code: 'TEST001',
      full_name: 'Test User',
      role: 'viewer',
      is_active: true,
      pin_hash: 'test_hash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 2: Stations table
  results.push({
    table: 'stations',
    passed: await testTable('stations', {
      name: 'Test Station',
      station_name: 'Test Station',
      station_code: `TST${Date.now()}`,
      location: 'Test Location',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 3: Account Receivables
  results.push({
    table: 'account_receivables',
    passed: await testTable('account_receivables', {
      creditor_name: 'Test Creditor',
      creditor_code: `TCR${Date.now()}`,
      total_amount: 10000,
      currency: 'CDF',
      due_date: new Date().toISOString(),
      status: 'pending',
      created_by: 'demo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 4: Account Payables
  results.push({
    table: 'account_payables',
    passed: await testTable('account_payables', {
      debtor_name: 'Test Debtor',
      debtor_code: `TDB${Date.now()}`,
      total_amount: 5000,
      currency: 'USD',
      due_date: new Date().toISOString(),
      status: 'pending',
      created_by: 'demo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 5: Expenses
  results.push({
    table: 'expenses',
    passed: await testTable('expenses', {
      category: 'Test',
      amount: 1000,
      description: 'Test expense',
      payment_method: 'cash',
      expense_date: new Date().toISOString(),
      created_by: 'demo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 6: Fund Transfers
  results.push({
    table: 'fund_transfers',
    passed: await testTable('fund_transfers', {
      from_account: 'test-from',
      to_account: 'test-to',
      amount: 5000,
      currency: 'CDF',
      transfer_date: new Date().toISOString(),
      created_by: 'demo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Test 7: Exchange Rates
  results.push({
    table: 'exchange_rates',
    passed: await testTable('exchange_rates', {
      from_currency: 'USD',
      to_currency: 'CDF',
      rate: 2300,
      effective_date: new Date().toISOString().split('T')[0],
      created_by: 'demo-1',
      created_at: new Date().toISOString(),
    })
  });

  // Test 8: Internal Accounts
  results.push({
    table: 'internal_accounts',
    passed: await testTable('internal_accounts', {
      account_name: 'Test Account',
      account_code: `TAC${Date.now()}`,
      account_type: 'cash',
      balance: 50000,
      currency: 'CDF',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  });

  // Results Summary
  console.log('\n========================================');
  console.log('  RESULTS SUMMARY');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    if (result.passed) {
      console.log(`  ✅ ${result.table}: PASSED`);
      passed++;
    } else {
      console.log(`  ❌ ${result.table}: FAILED`);
      failed++;
    }
  }
  
  console.log(`\n📊 Total: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  // Verify demo users can be read
  console.log('\n📋 Verifying demo user access...');
  const { data: demoUsers, error: demoError } = await supabase
    .from('users')
    .select('id, user_code, full_name, role')
    .in('id', ['demo-1', 'demo-2', 'demo-3', 'demo-4']);
  
  if (demoError) {
    console.log(`  ❌ Demo user query failed: ${demoError.message}`);
  } else {
    console.log(`  ✅ Found ${demoUsers?.length || 0} demo users in database`);
    if (demoUsers) {
      for (const user of demoUsers) {
        console.log(`     - ${user.user_code}: ${user.full_name} (${user.role})`);
      }
    }
  }

  console.log('\n========================================');
  console.log(`  TEST COMPLETE: ${passed === results.length ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`);
  console.log('========================================');
}

main().catch(console.error);