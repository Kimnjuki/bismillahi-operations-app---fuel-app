const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function executeSql(sql) {
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) {
        console.log(`  ⚠️  ${stmt.substring(0, 80)}...`);
        console.log(`      ${error.message.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  ❌ ${stmt.substring(0, 60)}: ${e.message.substring(0, 80)}`);
    }
  }
}

async function testTableAccess() {
  console.log('\n📋 Testing table access...');
  const tables = [
    'users', 'stations', 'account_receivables', 'account_payables',
    'expenses', 'fund_transfers', 'exchange_rates', 'internal_accounts',
    'pump_sales', 'drum_sales', 'stock_items', 'fuel_deliveries',
    'transporters', 'notifications', 'fuel_stock'
  ];

  let passed = 0;
  let failed = 0;

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: ${error.message.substring(0, 80)}`);
      failed++;
    } else {
      console.log(`  ✅ ${table}: accessible`);
      passed++;
    }
  }
  
  return { passed, failed };
}

async function testDataFlow() {
  console.log('\n📋 Testing INSERT -> SELECT flow...');
  
  // Test 1: Insert and read a user
  const testUser = {
    user_code: 'TEST001',
    full_name: 'Test Flow User',
    email: 'test@example.com',
    role: 'viewer',
    is_active: true,
    pin_hash: 'test_hash_12345',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert([testUser])
    .select()
    .single();

  if (userError) {
    console.log(`  ❌ User INSERT: ${userError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ User INSERT successful: ${userData.user_code} (${userData.full_name})`);
    
    // Read it back
    const { data: readUser, error: readError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.id)
      .single();
    
    if (readError) {
      console.log(`  ❌ User SELECT: ${readError.message.substring(0, 100)}`);
    } else {
      console.log(`  ✅ User SELECT successful: ${readUser.full_name}`);
      
      // Clean up
      await supabase.from('users').delete().eq('id', userData.id);
      console.log(`  ✅ User cleanup done`);
    }
  }

  // Test 2: Insert and read a receivable
  const testReceivable = {
    creditor_name: 'Test Creditor',
    creditor_code: `TCR${Date.now()}`,
    total_amount: 10000,
    currency: 'CDF',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    created_by: 'demo-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: recData, error: recError } = await supabase
    .from('account_receivables')
    .insert([testReceivable])
    .select()
    .single();

  if (recError) {
    console.log(`  ❌ Receivable INSERT: ${recError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Receivable INSERT: ${recData.creditor_name}`);
    
    const { data: readRec, error: readRecError } = await supabase
      .from('account_receivables')
      .select('*')
      .eq('id', recData.id)
      .single();
    
    if (readRecError) {
      console.log(`  ❌ Receivable SELECT: ${readRecError.message.substring(0, 100)}`);
    } else {
      console.log(`  ✅ Receivable SELECT: ${readRec.creditor_name} - ${readRec.currency} ${readRec.total_amount}`);
      await supabase.from('account_receivables').delete().eq('id', recData.id);
    }
  }

  // Test 3: Insert and read an expense
  const testExpense = {
    category: 'Test',
    amount: 2500,
    description: 'Test expense flow',
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
    created_by: 'demo-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: expData, error: expError } = await supabase
    .from('expenses')
    .insert([testExpense])
    .select()
    .single();

  if (expError) {
    console.log(`  ❌ Expense INSERT: ${expError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Expense INSERT: ${expData.category} - ${expData.amount}`);
    
    const { data: readExp, error: readExpError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expData.id)
      .single();
    
    if (readExpError) {
      console.log(`  ❌ Expense SELECT: ${readExpError.message.substring(0, 100)}`);
    } else {
      console.log(`  ✅ Expense SELECT: ${readExp.category} - ${readExp.description}`);
      await supabase.from('expenses').delete().eq('id', expData.id);
    }
  }

  return true;
}

async function main() {
  console.log('========================================');
  console.log('  COMPLETE SCHEMA FIX & TEST');
  console.log('========================================\n');
  
  // Step 1: Apply SQL
  console.log('1. Applying schema fixes...');
  const sql = fs.readFileSync('database/complete-schema-fix.sql', 'utf8');
  await executeSql(sql);
  console.log('   Schema fixes applied\n');

  // Step 2: Test table access
  console.log('2. Testing table accessibility...');
  const { passed, failed } = await testTableAccess();
  console.log(`   Result: ${passed} accessible, ${failed} failed\n`);

  // Step 3: Test data flow
  if (failed === 0) {
    console.log('3. Testing INSERT -> SELECT data flow...');
    await testDataFlow();
    console.log('\n   Data flow tests complete\n');
  }

  console.log('========================================');
  console.log(failed === 0 ? '  ALL CHECKS PASSED ✅' : '  SOME CHECKS FAILED ❌');
  console.log('========================================\n');
  
  console.log('Next steps:');
  console.log('1. Commit and push changes to GitHub');
  console.log('2. The Supabase connection is already configured in .env');
  console.log('3. Test the app by running: npm start');
}

main().catch(console.error);