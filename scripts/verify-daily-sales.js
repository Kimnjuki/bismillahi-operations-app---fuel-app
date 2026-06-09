const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdjoknphffficrepbxim.supabase.co',
  'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf'
);

async function main() {
  // Add missing columns to daily_sales if needed
  console.log('Ensuring daily_sales has all required columns...');
  await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE IF EXISTS public.daily_sales
        ADD COLUMN IF NOT EXISTS sale_date DATE,
        ADD COLUMN IF NOT EXISTS station_id UUID,
        ADD COLUMN IF NOT EXISTS pump_number INTEGER,
        ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) DEFAULT 'fuel',
        ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS volume_liters NUMERIC(12,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
        ADD COLUMN IF NOT EXISTS total_sales_usd NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_sales_cdf NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(12,4) DEFAULT 2300,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE public.daily_sales DISABLE ROW LEVEL SECURITY;
    `
  });
  await supabase.rpc('exec_sql', { sql: "NOTIFY pgrst, 'reload schema';" });
  await new Promise(r => setTimeout(r, 2000));

  // Check data
  const { data, error } = await supabase.from('daily_sales').select('*').order('sale_date', { ascending: false }).limit(10);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('\n=== DAILY SALES DATA ===');
  console.log(`Found ${data.length} rows\n`);

  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('\nData:');
    for (const row of data) {
      console.log(`  ${row.sale_date} | ${row.fuel_type} | ${row.volume_liters}L @ $${row.price_per_liter} = $${row.total_amount} | ${row.payment_method}`);
    }
  } else {
    console.log('No daily_sales data found');
  }
}

main().catch(console.error);