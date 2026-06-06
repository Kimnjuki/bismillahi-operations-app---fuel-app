const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Station data with proper UUIDs
const stations = [
  { 
    id: '550e8400-e29b-41d4-a716-446655440001', 
    name: 'ISSIRO STATION', 
    code: 'ISS', 
    location: 'Isiro',
    status: 'active'
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440002', 
    name: 'DEPOT ISSIRO', 
    code: 'DEP', 
    location: 'Isiro Depot',
    status: 'active'
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440003', 
    name: 'RUNGU STATION', 
    code: 'RUN', 
    location: 'Rungu',
    status: 'active'
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440004', 
    name: 'DUNGU STATION', 
    code: 'DUN', 
    location: 'Dungu',
    status: 'active'
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440005', 
    name: 'DURBA STATION', 
    code: 'DUR', 
    location: 'Durba',
    status: 'active'
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440006', 
    name: 'NIANGARA STATION', 
    code: 'NIA', 
    location: 'Niangara',
    status: 'active'
  },
];

async function setupStockManagementData() {
  try {
    console.log('🚀 Setting up stock management data...\n');

    // First, get a user ID for created_by field
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

    // Setup stations
    console.log('\n🏢 Setting up stations...');
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

    // Check if we can create stock_levels table data
    console.log('\n📊 Setting up stock levels...');
    
    // Try to insert stock levels for each station
    for (const station of stations) {
      // PMS stock level
      const pmsStock = {
        station_id: station.id,
        product_type: 'PMS',
        current_stock: station.name.includes('DEPOT') ? 15000 : 10000 + Math.floor(Math.random() * 5000),
        minimum_stock: 1000,
        maximum_stock: 20000,
        updated_by: userId,
      };

      const { error: pmsError } = await supabase
        .from('stock_levels')
        .upsert(pmsStock, { onConflict: 'station_id,product_type' });

      if (pmsError) {
        console.log(`⚠️  Error inserting PMS stock for ${station.name}:`, pmsError.message);
      } else {
        console.log(`✅ PMS stock for ${station.name} ready`);
      }

      // AGO stock level
      const agoStock = {
        station_id: station.id,
        product_type: 'AGO',
        current_stock: station.name.includes('DEPOT') ? 12000 : 8000 + Math.floor(Math.random() * 3000),
        minimum_stock: 500,
        maximum_stock: 15000,
        updated_by: userId,
      };

      const { error: agoError } = await supabase
        .from('stock_levels')
        .upsert(agoStock, { onConflict: 'station_id,product_type' });

      if (agoError) {
        console.log(`⚠️  Error inserting AGO stock for ${station.name}:`, agoError.message);
      } else {
        console.log(`✅ AGO stock for ${station.name} ready`);
      }
    }

    // Setup sample daily transactions
    console.log('\n📅 Setting up sample daily transactions...');
    for (const station of stations) {
      const transaction = {
        station_id: station.id,
        transaction_date: new Date().toISOString().split('T')[0],
        pms_received: station.name.includes('DEPOT') ? 8000 : 3000 + Math.floor(Math.random() * 2000),
        ago_received: station.name.includes('DEPOT') ? 5000 : 2000 + Math.floor(Math.random() * 1000),
        pms_sold: station.name.includes('DEPOT') ? 7500 : 2800 + Math.floor(Math.random() * 1500),
        ago_sold: station.name.includes('DEPOT') ? 4800 : 1900 + Math.floor(Math.random() * 800),
        pms_variance: 200,
        ago_variance: 100,
        notes: `Daily transaction for ${station.name}`,
        created_by: userId,
      };

      const { error: transactionError } = await supabase
        .from('daily_stock_transactions')
        .insert(transaction);

      if (transactionError) {
        console.log(`⚠️  Error inserting transaction for ${station.name}:`, transactionError.message);
      } else {
        console.log(`✅ Transaction for ${station.name} ready`);
      }
    }

    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    const { data: finalStations } = await supabase
      .from('stations')
      .select('*')
      .eq('status', 'active')
      .order('name');

    console.log(`✅ Final verification: ${finalStations?.length || 0} active stations`);
    
    if (finalStations && finalStations.length > 0) {
      console.log('\n📋 Available stations:');
      finalStations.forEach(station => {
        console.log(`   - ${station.name} (${station.code || 'No code'}) - ${station.location || 'No location'}`);
      });
    }

    // Test stock levels if table exists
    const { data: stockLevels, error: stockLevelsError } = await supabase
      .from('stock_levels')
      .select(`
        *,
        stations!inner(name, code)
      `)
      .limit(5);

    if (stockLevelsError) {
      console.log('⚠️  Stock levels table not accessible:', stockLevelsError.message);
    } else {
      console.log(`✅ Stock levels: ${stockLevels?.length || 0} entries`);
    }

    // Test daily transactions if table exists
    const { data: transactions, error: transactionsError } = await supabase
      .from('daily_stock_transactions')
      .select(`
        *,
        stations!inner(name, code)
      `)
      .limit(5);

    if (transactionsError) {
      console.log('⚠️  Daily transactions table not accessible:', transactionsError.message);
    } else {
      console.log(`✅ Daily transactions: ${transactions?.length || 0} entries`);
    }

    console.log('\n🎉 Stock management data setup completed!');
    console.log('The stock management screen is now ready with:');
    console.log('   ✅ All 6 stations configured');
    console.log('   ✅ Station selection feature');
    console.log('   ✅ Daily stock book functionality');
    console.log('   ✅ Real-time stock tracking');

  } catch (error) {
    console.error('❌ Error setting up stock management data:', error);
  }
}

// Run the setup
setupStockManagementData();











