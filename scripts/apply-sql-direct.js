const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY4MzE3OSwiZXhwIjoyMDczMjU5MTc5fQ.rX-ygxLMlHEZ-NuZAsBN9HAQ3DDR8qJ7BQ2xM13iRSM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySQLDirect() {
  try {
    console.log('🔧 Applying SQL fixes directly...');

    // Test current tables
    console.log('\n🧪 Testing current tables...');
    
    // Test security_events
    const { data: securityData, error: securityError } = await supabase
      .from('security_events')
      .select('*')
      .limit(1);

    if (securityError) {
      console.log('❌ Security events table error:', securityError.message);
    } else {
      console.log('✅ Security events table is working');
    }

    // Test daily_sales
    const { data: salesData, error: salesError } = await supabase
      .from('daily_sales')
      .select('*')
      .limit(1);

    if (salesError) {
      console.log('❌ Daily sales table error:', salesError.message);
    } else {
      console.log('✅ Daily sales table is working');
    }

    // Test users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table is working');
    }

    // Test operational_accounts
    const { data: opAccountsData, error: opAccountsError } = await supabase
      .from('operational_accounts')
      .select('*')
      .limit(1);

    if (opAccountsError) {
      console.log('❌ Operational accounts table error:', opAccountsError.message);
    } else {
      console.log('✅ Operational accounts table is working');
    }

    // Test account_transactions
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('account_transactions')
      .select('*')
      .limit(1);

    if (transactionsError) {
      console.log('❌ Account transactions table error:', transactionsError.message);
    } else {
      console.log('✅ Account transactions table is working');
    }

    console.log('\n📋 Manual SQL Application Required');
    console.log('Since the exec_sql RPC function is not available, please apply the following SQL manually in your Supabase dashboard:');
    console.log('\n1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/fix-security-events-final.sql');
    console.log('4. Execute the SQL statements');
    console.log('\nThis will fix the security events error and create the necessary tables.');

  } catch (error) {
    console.error('❌ Error testing tables:', error);
  }
}

// Run the test
applySQLDirect();





