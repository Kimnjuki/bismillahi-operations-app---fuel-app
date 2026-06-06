const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Station data
const stations = [
  { id: '1', name: 'ISSIRO STATION', code: 'ISS', location: 'Isiro' },
  { id: '2', name: 'DEPOT ISSIRO', code: 'DEP', location: 'Isiro Depot' },
  { id: '3', name: 'RUNGU STATION', code: 'RUN', location: 'Rungu' },
  { id: '4', name: 'DUNGU STATION', code: 'DUN', location: 'Dungu' },
  { id: '5', name: 'DURBA STATION', code: 'DUR', location: 'Durba' },
  { id: '6', name: 'NIANGARA STATION', code: 'NIA', location: 'Niangara' },
];

// Sample stock data
const stockData = [
  { station_id: '1', pms_balance: 12500, ago_balance: 8750, pms_minimum: 1000, ago_minimum: 500 },
  { station_id: '2', pms_balance: 15000, ago_balance: 12000, pms_minimum: 2000, ago_minimum: 1000 },
  { station_id: '3', pms_balance: 8500, ago_balance: 6500, pms_minimum: 1000, ago_minimum: 500 },
  { station_id: '4', pms_balance: 9500, ago_balance: 7200, pms_minimum: 1000, ago_minimum: 500 },
  { station_id: '5', pms_balance: 11000, ago_balance: 8000, pms_minimum: 1000, ago_minimum: 500 },
  { station_id: '6', pms_balance: 7500, ago_balance: 5500, pms_minimum: 1000, ago_minimum: 500 },
];

// Sample daily entries
const dailyEntries = [
  { station_id: '1', pms_received: 5000, ago_received: 3000, pms_sold: 4800, ago_sold: 2900, pms_variance: 200, ago_variance: 100 },
  { station_id: '2', pms_received: 8000, ago_received: 5000, pms_sold: 7500, ago_sold: 4800, pms_variance: 500, ago_variance: 200 },
  { station_id: '3', pms_received: 3000, ago_received: 2000, pms_sold: 2800, ago_sold: 1900, pms_variance: 200, ago_variance: 100 },
  { station_id: '4', pms_received: 4000, ago_received: 2500, pms_sold: 3800, ago_sold: 2400, pms_variance: 200, ago_variance: 100 },
  { station_id: '5', pms_received: 6000, ago_received: 3500, pms_sold: 5800, ago_sold: 3400, pms_variance: 200, ago_variance: 100 },
  { station_id: '6', pms_received: 2500, ago_received: 1500, pms_sold: 2300, ago_sold: 1400, pms_variance: 200, ago_variance: 100 },
];

async function setupStockData() {
  try {
    console.log('🚀 Setting up stock management data...\n');

    // First, let's check if we can access the tables
    console.log('📋 Checking existing tables...');
    
    // Try to get a user ID for created_by field
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    let userId = null;
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log('✅ Found user for created_by field');
    } else {
      console.log('⚠️  No users found, will use null for created_by');
    }

    // Test if stations table exists and is accessible
    console.log('\n🏢 Testing stations table...');
    const { data: existingStations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .limit(1);

    if (stationsError) {
      console.log('❌ Stations table not accessible:', stationsError.message);
      console.log('Please ensure the stations table exists in your database.');
      return;
    }

    console.log('✅ Stations table is accessible');

    // Insert stations if they don't exist
    console.log('\n📝 Inserting stations...');
    for (const station of stations) {
      const { error: insertError } = await supabase
        .from('stations')
        .upsert(station, { onConflict: 'id' });

      if (insertError) {
        console.log(`⚠️  Error inserting station ${station.name}:`, insertError.message);
      } else {
        console.log(`✅ Station ${station.name} ready`);
      }
    }

    // Test stock_balances table
    console.log('\n📊 Testing stock_balances table...');
    const { data: existingBalances, error: balancesError } = await supabase
      .from('stock_balances')
      .select('*')
      .limit(1);

    if (balancesError) {
      console.log('❌ Stock balances table not accessible:', balancesError.message);
      console.log('The stock management feature will use mock data.');
    } else {
      console.log('✅ Stock balances table is accessible');
      
      // Insert stock data
      console.log('\n📝 Inserting stock data...');
      for (const stock of stockData) {
        const { error: insertError } = await supabase
          .from('stock_balances')
          .upsert(stock, { onConflict: 'station_id' });

        if (insertError) {
          console.log(`⚠️  Error inserting stock for station ${stock.station_id}:`, insertError.message);
        } else {
          console.log(`✅ Stock data for station ${stock.station_id} ready`);
        }
      }
    }

    // Test daily_stock_entries table
    console.log('\n📅 Testing daily_stock_entries table...');
    const { data: existingEntries, error: entriesError } = await supabase
      .from('daily_stock_entries')
      .select('*')
      .limit(1);

    if (entriesError) {
      console.log('❌ Daily stock entries table not accessible:', entriesError.message);
      console.log('The daily stock book feature will work with local data only.');
    } else {
      console.log('✅ Daily stock entries table is accessible');
      
      // Insert daily entries
      console.log('\n📝 Inserting daily entries...');
      for (const entry of dailyEntries) {
        const entryWithUser = {
          ...entry,
          entry_date: new Date().toISOString().split('T')[0],
          created_by: userId,
        };

        const { error: insertError } = await supabase
          .from('daily_stock_entries')
          .insert(entryWithUser);

        if (insertError) {
          console.log(`⚠️  Error inserting daily entry for station ${entry.station_id}:`, insertError.message);
        } else {
          console.log(`✅ Daily entry for station ${entry.station_id} ready`);
        }
      }
    }

    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    const { data: finalStations } = await supabase
      .from('stations')
      .select('*')
      .order('name');

    console.log(`✅ Final verification: ${finalStations?.length || 0} stations available`);
    
    if (finalStations && finalStations.length > 0) {
      console.log('\n📋 Available stations:');
      finalStations.forEach(station => {
        console.log(`   - ${station.name} (${station.code})`);
      });
    }

    console.log('\n🎉 Stock management data setup completed!');
    console.log('The stock management screen is now ready with multi-station support.');

  } catch (error) {
    console.error('❌ Error setting up stock data:', error);
  }
}

// Run the setup
setupStockData();











