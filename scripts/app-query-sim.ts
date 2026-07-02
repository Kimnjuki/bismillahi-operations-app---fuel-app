import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY5MDksImV4cCI6MjA5NjMzMjkwOX0.pjavkvr6QlJhkIi3MGfqd1ayFFvOIzsEsNFUkzzqA78';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== Full Diagnostic ===\n');

  // 1. Auth check (like app does on load)
  console.log('--- Auth state ---');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user ? `id=${user.id}` : 'null/anon');

  // 2. Exact query the app uses
  console.log('\n--- App query simulation ---');
  const start = Date.now();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  const elapsed = Date.now() - start;

  if (error) {
    console.log('❌ Query failed:', error);
    console.log('Time:', elapsed, 'ms');
    return;
  }

  console.log(`✅ Query succeeded in ${elapsed}ms`);
  console.log(`Returned ${data?.length ?? 0} rows:`);
  data?.forEach((row) => console.log(`  - "${row.name}"`));

  // 3. Check if this is truly a network/RLS problem by doing a direct count
  console.log('\n--- Direct count ---');
  const { count, error: countError } = await supabase
    .from('expense_categories')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('Count failed:', countError);
  } else {
    console.log(`Total rows in table: ${count}`);
  }
}

diagnose().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
