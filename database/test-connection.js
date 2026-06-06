// Test Supabase Connection
// Run this with: node database/test-connection.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Sample data:', data);
    
    // Test if tables exist
    const tables = [
      'users', 'pump_sales', 'drum_sales', 'stock_items', 
      'stock_variances', 'expenses', 'fund_transfers', 
      'exchange_rates', 'notifications', 'expense_categories'
    ];
    
    console.log('\nTesting table access...');
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ Table '${table}': ${tableError.message}`);
        } else {
          console.log(`✅ Table '${table}': Accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();
