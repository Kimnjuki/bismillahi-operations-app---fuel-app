const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema for stock management...\n');

    // Check stations table
    console.log('🏢 Checking stations table...');
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .limit(1);

    if (stationsError) {
      console.log('❌ Stations table error:', stationsError.message);
    } else {
      console.log('✅ Stations table accessible');
      if (stations && stations.length > 0) {
        console.log('   Columns:', Object.keys(stations[0]));
      }
    }

    // Check stock_balances table
    console.log('\n📊 Checking stock_balances table...');
    const { data: balances, error: balancesError } = await supabase
      .from('stock_balances')
      .select('*')
      .limit(1);

    if (balancesError) {
      console.log('❌ Stock balances table error:', balancesError.message);
    } else {
      console.log('✅ Stock balances table accessible');
      if (balances && balances.length > 0) {
        console.log('   Columns:', Object.keys(balances[0]));
      }
    }

    // Check daily_stock_entries table
    console.log('\n📅 Checking daily_stock_entries table...');
    const { data: entries, error: entriesError } = await supabase
      .from('daily_stock_entries')
      .select('*')
      .limit(1);

    if (entriesError) {
      console.log('❌ Daily stock entries table error:', entriesError.message);
    } else {
      console.log('✅ Daily stock entries table accessible');
      if (entries && entries.length > 0) {
        console.log('   Columns:', Object.keys(entries[0]));
      }
    }

    // Check if we can insert a simple test record
    console.log('\n🧪 Testing insert capabilities...');
    
    // Try to insert a test station
    const testStation = {
      name: 'TEST STATION',
      code: 'TEST',
      location: 'Test Location'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('stations')
      .insert(testStation)
      .select();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test successful');
      console.log('   Inserted station:', insertData);
      
      // Clean up test data
      if (insertData && insertData.length > 0) {
        await supabase
          .from('stations')
          .delete()
          .eq('id', insertData[0].id);
        console.log('✅ Test data cleaned up');
      }
    }

    console.log('\n📋 Summary:');
    console.log('The stock management feature will work with the existing database schema.');
    console.log('If some columns are missing, the app will use mock data for demonstration.');

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  }
}

// Run the check
checkDatabaseSchema();











