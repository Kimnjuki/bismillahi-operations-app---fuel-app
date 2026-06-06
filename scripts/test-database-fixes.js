const { createClient } = require('@supabase/supabase-js');

// Use the hardcoded values from the config
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseFixes() {
  console.log('🧪 Testing database fixes...');
  
  const tests = [
    {
      name: 'Users Table Access',
      test: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Account Receivables Table',
      test: async () => {
        const { data, error } = await supabase
          .from('account_receivables')
          .select('id')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Account Payables Table',
      test: async () => {
        const { data, error } = await supabase
          .from('account_payables')
          .select('id')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Daily Sales Table with Price Column',
      test: async () => {
        const { data, error } = await supabase
          .from('daily_sales')
          .select('id, price_per_liter')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n⚡ Testing: ${test.name}`);
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ ${test.name}: PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   Exception: ${error.message}`);
    }
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All database fixes are working correctly!');
    console.log('\n✅ The app should now function properly without database errors.');
  } else {
    console.log('⚠️  Some tests failed. Please apply the manual fixes from CRITICAL_FIXES_INSTRUCTIONS.md');
    console.log('\n📝 Manual fixes required:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run the SQL scripts from database/quick-fix.sql');
    console.log('3. Verify all tables and policies are created correctly');
  }
}

// Run the tests
testDatabaseFixes();







