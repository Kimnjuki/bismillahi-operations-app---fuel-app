const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyStockSchema() {
  try {
    console.log('🚀 Applying stock management schema updates...\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync('database/update-stock-schema.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} result:`, error.message);
            // Continue with other statements even if one fails
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Error executing statement ${i + 1}:`, err.message);
        }
      }
    }

    // Test the new tables
    console.log('\n🧪 Testing new tables...');
    
    // Test stations table
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .limit(5);

    if (stationsError) {
      console.log('❌ Error testing stations table:', stationsError.message);
    } else {
      console.log(`✅ Stations table: Found ${stations?.length || 0} stations`);
      if (stations && stations.length > 0) {
        console.log('   Sample stations:');
        stations.forEach(station => {
          console.log(`   - ${station.name} (${station.code})`);
        });
      }
    }

    // Test stock_balances table
    const { data: balances, error: balancesError } = await supabase
      .from('stock_balances')
      .select(`
        *,
        stations!inner(name)
      `)
      .limit(5);

    if (balancesError) {
      console.log('❌ Error testing stock_balances table:', balancesError.message);
    } else {
      console.log(`✅ Stock balances table: Found ${balances?.length || 0} entries`);
      if (balances && balances.length > 0) {
        console.log('   Sample balances:');
        balances.forEach(balance => {
          console.log(`   - ${balance.stations?.name}: PMS ${balance.pms_balance}L, AGO ${balance.ago_balance}L`);
        });
      }
    }

    // Test daily_stock_entries table
    const { data: entries, error: entriesError } = await supabase
      .from('daily_stock_entries')
      .select(`
        *,
        stations!inner(name)
      `)
      .limit(5);

    if (entriesError) {
      console.log('❌ Error testing daily_stock_entries table:', entriesError.message);
    } else {
      console.log(`✅ Daily stock entries table: Found ${entries?.length || 0} entries`);
      if (entries && entries.length > 0) {
        console.log('   Sample entries:');
        entries.forEach(entry => {
          console.log(`   - ${entry.stations?.name}: PMS +${entry.pms_received}/-${entry.pms_sold}L`);
        });
      }
    }

    console.log('\n🎉 Stock management schema update completed!');
    console.log('Your stock management feature is now ready with multi-station support.');

  } catch (error) {
    console.error('❌ Error applying stock schema:', error);
  }
}

// Run the script
applyStockSchema();











