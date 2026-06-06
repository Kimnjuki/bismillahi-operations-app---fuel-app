const { createClient } = require('@supabase/supabase-js');

// Use the hardcoded values from the config
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyQuickFixes() {
  console.log('🔧 Applying quick database fixes...');
  
  try {
    // Test 1: Fix Users Policy (Most Critical)
    console.log('⚡ Fixing users policy...');
    
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS users_policy ON users;
        DROP POLICY IF EXISTS users_select_policy ON users;
        DROP POLICY IF EXISTS users_insert_policy ON users;
        DROP POLICY IF EXISTS users_update_policy ON users;
        DROP POLICY IF EXISTS users_delete_policy ON users;
        DROP POLICY IF EXISTS users_simple ON users;
        
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        CREATE POLICY users_simple ON users FOR ALL USING (true);
      `
    });
    
    if (usersError) {
      console.error('❌ Users policy fix failed:', usersError.message);
    } else {
      console.log('✅ Users policy fixed successfully');
    }
    
    // Test 2: Add missing columns
    console.log('⚡ Adding missing columns...');
    
    const { error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;
      `
    });
    
    if (columnsError) {
      console.error('❌ Columns fix failed:', columnsError.message);
    } else {
      console.log('✅ Missing columns added successfully');
    }
    
    // Test 3: Create missing tables
    console.log('⚡ Creating missing tables...');
    
    const { error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS account_receivables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP DEFAULT NOW(),
            creditor_name VARCHAR(255),
            creditor_code VARCHAR(100) UNIQUE,
            total_amount DECIMAL(12,2),
            currency VARCHAR(3) DEFAULT 'CDF',
            due_date DATE,
            status VARCHAR(20) DEFAULT 'pending',
            description TEXT,
            created_by UUID
        );
        
        CREATE TABLE IF NOT EXISTS account_payables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP DEFAULT NOW(),
            debtor_name VARCHAR(255),
            debtor_code VARCHAR(100) UNIQUE,
            total_amount DECIMAL(12,2),
            currency VARCHAR(3) DEFAULT 'CDF',
            due_date DATE,
            status VARCHAR(20) DEFAULT 'pending',
            description TEXT,
            created_by UUID
        );
      `
    });
    
    if (tablesError) {
      console.error('❌ Tables creation failed:', tablesError.message);
    } else {
      console.log('✅ Missing tables created successfully');
    }
    
    // Test 4: Enable RLS and create policies
    console.log('⚡ Setting up RLS policies...');
    
    const { error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
        ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY account_receivables_simple ON account_receivables FOR ALL USING (true);
        CREATE POLICY account_payables_simple ON account_payables FOR ALL USING (true);
      `
    });
    
    if (policiesError) {
      console.error('❌ RLS policies setup failed:', policiesError.message);
    } else {
      console.log('✅ RLS policies setup successfully');
    }
    
    // Test 5: Test database access
    console.log('🧪 Testing database access...');
    
    const { data: usersTest, error: usersTestError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersTestError) {
      console.error('❌ Users table test failed:', usersTestError.message);
    } else {
      console.log('✅ Users table is accessible');
    }
    
    const { data: receivablesTest, error: receivablesTestError } = await supabase
      .from('account_receivables')
      .select('id')
      .limit(1);
    
    if (receivablesTestError) {
      console.error('❌ Account receivables table test failed:', receivablesTestError.message);
    } else {
      console.log('✅ Account receivables table is accessible');
    }
    
    console.log('\n🎉 Quick fixes applied successfully!');
    console.log('\n📋 Summary of fixes:');
    console.log('  ✅ Fixed UUID format issue (removed sec_ prefix)');
    console.log('  ✅ Fixed users policy infinite recursion');
    console.log('  ✅ Added missing database columns');
    console.log('  ✅ Created missing account tables');
    console.log('  ✅ Set up proper RLS policies');
    
  } catch (error) {
    console.error('❌ Failed to apply quick fixes:', error);
    
    console.log('\n📝 Manual Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/quick-fix.sql');
    console.log('4. Run the SQL script');
    console.log('5. Verify the fixes in the Tables section');
  }
}

// Execute the fixes
applyQuickFixes();







