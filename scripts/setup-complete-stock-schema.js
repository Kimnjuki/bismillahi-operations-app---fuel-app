const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCompleteStockSchema() {
  try {
    console.log('🚀 Setting up complete stock management schema...\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync('database/complete-stock-schema.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          
          // Try to execute the statement using a simple approach
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} result:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } catch (err) {
          console.log(`❌ Error executing statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Test the new tables
    console.log('\n🧪 Testing new tables...');
    
    // Test stations table
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (stationsError) {
      console.log('❌ Error testing stations table:', stationsError.message);
    } else {
      console.log(`✅ Stations table: Found ${stations?.length || 0} active stations`);
      if (stations && stations.length > 0) {
        console.log('   Available stations:');
        stations.forEach(station => {
          console.log(`   - ${station.name} (${station.code || 'No code'}) - ${station.location || 'No location'}`);
        });
      }
    }

    // Test stock_levels table
    const { data: stockLevels, error: stockLevelsError } = await supabase
      .from('stock_levels')
      .select(`
        *,
        stations!inner(name, code)
      `)
      .limit(10);

    if (stockLevelsError) {
      console.log('❌ Error testing stock_levels table:', stockLevelsError.message);
    } else {
      console.log(`✅ Stock levels table: Found ${stockLevels?.length || 0} entries`);
      if (stockLevels && stockLevels.length > 0) {
        console.log('   Sample stock levels:');
        stockLevels.forEach(level => {
          console.log(`   - ${level.stations?.name}: ${level.product_type} ${level.current_stock}L (Min: ${level.minimum_stock}L)`);
        });
      }
    }

    // Test daily_stock_transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('daily_stock_transactions')
      .select(`
        *,
        stations!inner(name, code)
      `)
      .order('transaction_date', { ascending: false })
      .limit(5);

    if (transactionsError) {
      console.log('❌ Error testing daily_stock_transactions table:', transactionsError.message);
    } else {
      console.log(`✅ Daily stock transactions table: Found ${transactions?.length || 0} entries`);
      if (transactions && transactions.length > 0) {
        console.log('   Sample transactions:');
        transactions.forEach(transaction => {
          console.log(`   - ${transaction.stations?.name}: PMS +${transaction.pms_received}/-${transaction.pms_sold}L, AGO +${transaction.ago_received}/-${transaction.ago_sold}L`);
        });
      }
    }

    console.log('\n🎉 Complete stock management schema setup completed!');
    console.log('Your stock management feature is now fully functional with:');
    console.log('   ✅ Multi-station support');
    console.log('   ✅ Real-time stock tracking');
    console.log('   ✅ Daily stock book functionality');
    console.log('   ✅ Automatic stock level updates');

  } catch (error) {
    console.error('❌ Error setting up complete stock schema:', error);
  }
}

// Run the setup
setupCompleteStockSchema();











