const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection with current credentials
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test basic connection
    console.log('\n1. Testing basic connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('Auth test result:', authError.message);
    } else {
      console.log('Auth test: Connected successfully');
    }
    
    // Test table access
    console.log('\n2. Testing table access...');
    
    // Test users table
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (usersError) {
        console.log('Users table error:', usersError.message);
      } else {
        console.log('Users table: Accessible');
      }
    } catch (err) {
      console.log('Users table exception:', err.message);
    }
    
    // Test security_events table
    try {
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .limit(1);
      
      if (eventsError) {
        console.log('Security events table error:', eventsError.message);
      } else {
        console.log('Security events table: Accessible');
      }
    } catch (err) {
      console.log('Security events table exception:', err.message);
    }
    
    // Test daily_sales table
    try {
      const { data: sales, error: salesError } = await supabase
        .from('daily_sales')
        .select('*')
        .limit(1);
      
      if (salesError) {
        console.log('Daily sales table error:', salesError.message);
      } else {
        console.log('Daily sales table: Accessible');
      }
    } catch (err) {
      console.log('Daily sales table exception:', err.message);
    }
    
    console.log('\n✅ Supabase connection test completed!');
    console.log('\nIf you see errors above, you need to:');
    console.log('1. Apply the database schema fixes');
    console.log('2. Fix the RLS policies');
    console.log('3. Add missing tables and columns');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testSupabaseConnection();







