import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY5MDksImV4cCI6MjA5NjMzMjkwOX0.pjavkvr6QlJhkIi3MGfqd1ayFFvOIzsEsNFUkzzqA78';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EXPENSE_CATEGORIES = [
  'Generator',
  'Workers\' fare and lunch',
  'Security',
  'Transport',
  'Government expenses',
  'Offloading expenses',
  'Medical',
  'Travel expenses',
  'Communication',
  'Salary',
  'Stationaries',
  'Discount',
  'Sadaqa',
  'Repair and Maintenance',
  'Rent',
];

async function seedCategories() {
  console.log('Seeding expense categories...\n');

  const results = [];
  for (const name of EXPENSE_CATEGORIES) {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name, is_active: true })
      .select();

    if (error) {
      console.error(`Failed to insert "${name}":`, error.message);
      results.push({ name, success: false, error: error.message });
    } else {
      console.log(`Inserted "${name}"`);
      results.push({ name, success: true, data });
    }
  }

  console.log('\n--- Verification ---');
  const { data: allCategories, error: fetchError } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch categories:', fetchError.message);
  } else {
    console.log(`Total categories in DB: ${allCategories?.length ?? 0}`);
    allCategories?.forEach((c: any) => console.log(` - ${c.name}`));
  }

  return results;
}

seedCategories()
  .then((results) => {
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.log(`\nCompleted with ${failed.length} errors.`);
      process.exit(1);
    } else {
      console.log('\nAll categories seeded successfully.');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
