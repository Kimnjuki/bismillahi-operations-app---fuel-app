const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function execSql(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.log(`  ⚠️  ${error.message.substring(0, 100)}`);
    return false;
  }
  return true;
}

async function seedTable(tableName, data) {
  const { error } = await supabase.from(tableName).insert(data);
  if (error) {
    console.log(`  ❌ ${tableName}: ${error.message.substring(0, 100)}`);
    return false;
  }
  console.log(`  ✅ ${tableName}: ${data.length} rows inserted`);
  return true;
}

async function countTable(tableName) {
  const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
}

async function main() {
  console.log('========================================');
  console.log('  SEED DATA FOR ALL TABLES');
  console.log('========================================\n');

  // Step 0: Make created_by columns text instead of UUID for flexibility
  console.log('0. Fixing column types...');
  
  // Make sure account_receivables and account_payables have the right columns
  const fixSql = `
    DO $$
    BEGIN
      -- Fix account_receivables: ensure creditor_code exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_receivables' AND column_name = 'creditor_code'
      ) THEN
        ALTER TABLE public.account_receivables ADD COLUMN creditor_code VARCHAR(100);
      END IF;

      -- Fix account_payables: ensure debtor_code exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_payables' AND column_name = 'debtor_code'
      ) THEN
        ALTER TABLE public.account_payables ADD COLUMN debtor_code VARCHAR(100);
      END IF;

      -- Fix expenses: ensure description exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'description'
      ) THEN
        ALTER TABLE public.expenses ADD COLUMN description TEXT;
      END IF;

      -- Fix internal_accounts: ensure account_code exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'account_code'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN account_code VARCHAR(100);
      END IF;

      -- Fix internal_accounts: ensure account_name exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'account_name'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN account_name VARCHAR(255);
      END IF;

      -- Fix internal_accounts: ensure account_type exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'account_type'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN account_type VARCHAR(50);
      END IF;

      -- Fix internal_accounts: ensure balance exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'balance'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN balance NUMERIC(15,2) DEFAULT 0;
      END IF;

      -- Fix internal_accounts: ensure currency exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'currency'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'CDF';
      END IF;

      -- Fix internal_accounts: ensure is_active exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_accounts' AND column_name = 'is_active'
      ) THEN
        ALTER TABLE public.internal_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
      END IF;

      -- Fix pump_sales: ensure required columns exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'pump_number'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN pump_number INTEGER DEFAULT 1;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'fuel_type'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN fuel_type VARCHAR(50);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'volume_liters'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN volume_liters NUMERIC(12,3) DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'price_per_liter'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN price_per_liter NUMERIC(10,2) DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'total_amount'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN total_amount NUMERIC(15,2) DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'payment_method'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN payment_method VARCHAR(20);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pump_sales' AND column_name = 'sale_date'
      ) THEN
        ALTER TABLE public.pump_sales ADD COLUMN sale_date DATE DEFAULT CURRENT_DATE;
      END IF;

    END $$;
  `;
  await execSql(fixSql);
  console.log('  Column types fixed\n');

  // Step 1: Check existing exchange rate
  const existingRate = await countTable('exchange_rates');
  if (existingRate === 0) {
    console.log('1. Seeding exchange_rates...');
    await seedTable('exchange_rates', [{
      rate: 2300,
      from_currency: 'USD',
      to_currency: 'CDF',
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
    }]);
  } else {
    console.log(`1. exchange_rates: ${existingRate} rows already exist, skipping`);
  }

  // Step 2: Check existing internal accounts
  const existingAccts = await countTable('internal_accounts');
  if (existingAccts === 0) {
    console.log('2. Seeding internal_accounts...');
    const stations = await supabase.from('stations').select('id').limit(6);
    const stationIds = stations.data || [];
    
    await seedTable('internal_accounts', [
      {
        account_name: 'BISMILLAHI - ISSIRO STATION (CDF)',
        account_code: 'ISS_CDF',
        account_type: 'cash',
        station_id: stationIds[0]?.id || null,
        balance: 2500000,
        currency: 'CDF',
        is_active: true,
      },
      {
        account_name: 'BISMILLAHI - ISSIRO STATION (USD)',
        account_code: 'ISS_USD',
        account_type: 'bank',
        station_id: stationIds[0]?.id || null,
        balance: 150000,
        currency: 'USD',
        is_active: true,
      },
      {
        account_name: 'Personal Account (USD)',
        account_code: 'PERS_USD',
        account_type: 'bank',
        station_id: stationIds[0]?.id || null,
        balance: 50000,
        currency: 'USD',
        is_active: true,
      },
      {
        account_name: 'DEPOT ISSIRO - Operations (USD)',
        account_code: 'DEP_OPS',
        account_type: 'operations',
        station_id: stationIds[1]?.id || null,
        balance: 200000,
        currency: 'USD',
        is_active: true,
      },
      {
        account_name: 'RUNGU STATION - Fuel Account (USD)',
        account_code: 'RUN_FUEL',
        account_type: 'fuel_account',
        station_id: stationIds[2]?.id || null,
        balance: 120000,
        currency: 'USD',
        is_active: true,
      },
    ]);
  } else {
    console.log(`2. internal_accounts: ${existingAccts} rows already exist, skipping`);
  }

  // Step 3: Account Receivables
  const existingAR = await countTable('account_receivables');
  if (existingAR === 0) {
    console.log('3. Seeding account_receivables...');
    await seedTable('account_receivables', [
      {
        creditor_name: 'Congo Fuel Supply Ltd',
        creditor_code: 'CFS001',
        total_amount: 5000000,
        currency: 'CDF',
        due_date: '2026-07-15',
        status: 'pending',
        description: 'Fuel supply payment',
      },
      {
        creditor_name: 'Kinshasa Equipment Co',
        creditor_code: 'KEC002',
        total_amount: 2500,
        currency: 'USD',
        due_date: '2026-07-20',
        status: 'overdue',
        description: 'Equipment maintenance',
      },
      {
        creditor_name: 'Issiro General Suppliers',
        creditor_code: 'IGS003',
        total_amount: 3000000,
        currency: 'CDF',
        due_date: '2026-08-01',
        status: 'pending',
        description: 'Station supplies and consumables',
      },
    ]);
  } else {
    console.log(`3. account_receivables: ${existingAR} rows already exist, skipping`);
  }

  // Step 4: Account Payables
  const existingAP = await countTable('account_payables');
  if (existingAP === 0) {
    console.log('4. Seeding account_payables...');
    await seedTable('account_payables', [
      {
        debtor_name: 'Rungu Transport Services',
        debtor_code: 'RTS001',
        total_amount: 2000000,
        currency: 'CDF',
        due_date: '2026-07-18',
        status: 'pending',
        description: 'Fuel delivery payment',
      },
      {
        debtor_name: 'Dungu Petroleum Dealers',
        debtor_code: 'DPD002',
        total_amount: 1500,
        currency: 'USD',
        due_date: '2026-07-22',
        status: 'overdue',
        description: 'Service charges',
      },
    ]);
  } else {
    console.log(`4. account_payables: ${existingAP} rows already exist, skipping`);
  }

  // Step 5: Expenses
  const existingExp = await countTable('expenses');
  if (existingExp === 0) {
    console.log('5. Seeding expenses...');
    await seedTable('expenses', [
      {
        category: 'Operations',
        amount: 50000,
        description: 'Station maintenance and cleaning',
        payment_method: 'cash',
        expense_date: new Date().toISOString().split('T')[0],
      },
      {
        category: 'Utilities',
        amount: 150000,
        description: 'Monthly electricity bill',
        payment_method: 'cash',
        expense_date: new Date().toISOString().split('T')[0],
      },
    ]);
  } else {
    console.log(`5. expenses: ${existingExp} rows already exist, skipping`);
  }

  // Step 6: Fund Transfers
  const existingFT = await countTable('fund_transfers');
  if (existingFT === 0) {
    console.log('6. Seeding fund_transfers...');
    await seedTable('fund_transfers', [
      {
        from_account: 'Issiro Cash (CDF)',
        to_account: 'Issiro Bank (USD)',
        amount: 500000,
        currency: 'CDF',
        transfer_date: new Date().toISOString().split('T')[0],
        purpose: 'Daily cash deposit',
        status: 'completed',
      },
    ]);
  } else {
    console.log(`6. fund_transfers: ${existingFT} rows already exist, skipping`);
  }

  // Step 7: Pump Sales
  const existingPS = await countTable('pump_sales');
  if (existingPS === 0) {
    console.log('7. Seeding pump_sales...');
    await seedTable('pump_sales', [
      {
        pump_number: 1,
        fuel_type: 'Petrol',
        volume_liters: 500,
        price_per_liter: 2.5,
        total_amount: 1250,
        payment_method: 'cash',
        sale_date: new Date().toISOString().split('T')[0],
      },
      {
        pump_number: 2,
        fuel_type: 'Diesel',
        volume_liters: 300,
        price_per_liter: 2.3,
        total_amount: 690,
        payment_method: 'cash',
        sale_date: new Date().toISOString().split('T')[0],
      },
    ]);
  } else {
    console.log(`7. pump_sales: ${existingPS} rows already exist, skipping`);
  }

  // Step 8: Drum Sales
  const existingDS = await countTable('drum_sales');
  if (existingDS === 0) {
    console.log('8. Seeding drum_sales...');
    await seedTable('drum_sales', [
      {
        drum_type: '200L Drum',
        quantity: 5,
        price_per_drum: 450,
        total_amount: 2250,
        payment_method: 'cash',
        sale_date: new Date().toISOString().split('T')[0],
      },
    ]);
  } else {
    console.log(`8. drum_sales: ${existingDS} rows already exist, skipping`);
  }

  // Final verification
  console.log('\n========================================');
  console.log('  FINAL VERIFICATION');
  console.log('========================================\n');
  
  const tables = [
    'users', 'stations', 'account_receivables', 'account_payables',
    'expenses', 'fund_transfers', 'exchange_rates', 'internal_accounts',
    'pump_sales', 'drum_sales'
  ];

  for (const table of tables) {
    const count = await countTable(table);
    const status = count > 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${table}: ${count} rows`);
  }

  console.log('\n========================================');
  console.log('  SEED COMPLETE');
  console.log('========================================');
}

main().catch(console.error);