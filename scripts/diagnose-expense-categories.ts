import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY5MDksImV4cCI6MjA5NjMzMjkwOX0.pjavkvr6QlJhkIi3MGfqd1ayFFvOIzsEsNFUkzzqA78';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== Expense Categories Diagnostic ===\n');

  // 1. Check RLS policies on expense_categories
  console.log('--- Checking RLS policies on expense_categories ---');
  try {
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'expense_categories');

    if (policyError) {
      console.log('Could not fetch policies (maybe RLS disabled or no access to pg_policies):', policyError.message);
    } else {
      console.log(`Found ${policies?.length ?? 0} RLS policies on expense_categories:`);
      policies?.forEach((p) => {
        console.log(`  - ${p.policyname}: ${p.cmd} (USING: ${p.qual}, WITH CHECK: ${p.with_check})`);
      });
    }
  } catch (e) {
    console.log('Error checking policies:', (e as Error).message);
  }

  // 2. Exact app query: select name where is_active = true
  console.log('\n--- Simulating app query: select name where is_active = true ---');
  const { data: activeCat, error: activeError } = await supabase
    .from('expense_categories')
    .select('name, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (activeError) {
    console.log('❌ App query FAILED:', activeError.message);
    console.log('   code:', activeError.code);
    console.log('   details:', activeError.details);
    console.log('   hint:', activeError.hint);
  } else {
    console.log(`✅ App query returned ${activeCat?.length ?? 0} categories`);
    activeCat?.forEach((c) => console.log(`  - ${c.name}`));
  }

  // 3. Simple select all
  console.log('\n--- Simple select * from expense_categories ---');
  const { data: allCat, error: allError } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name', { ascending: true });

  if (allError) {
    console.log('❌ Select all FAILED:', allError.message);
  } else {
    console.log(`✅ Select all returned ${allCat?.length ?? 0} rows`);
  }

  // 4. Check if table is even visible in information_schema from anon perspective
  console.log('\n--- Checking table visibility ---');
  const { data: tableInfo, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'expense_categories');

  if (tableError) {
    console.log('information_schema query failed:', tableError.message);
  } else {
    console.log(`information_schema sees ${tableInfo?.length ?? 0} expense_categories tables`);
  }
}

diagnose().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
