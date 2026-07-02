import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkam9rbnBoZmZmaWNyZXBieGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY5MDksImV4cCI6MjA5NjMzMjkwOX0.pjavkvr6QlJhkIi3MGfqd1ayFFvOIzsEsNFUkzzqA78';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TARGET_CATEGORIES = [
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

async function cleanupAndFix() {
  console.log('Fetching all expense categories...\n');

  const { data: allCategories, error: fetchError } = await supabase
    .from('expense_categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch categories:', fetchError.message);
    process.exit(1);
  }

  console.log(`Total categories found: ${allCategories?.length ?? 0}\n`);

  // Group by name
  const byName: Record<string, any[]> = {};
  allCategories?.forEach((c) => {
    if (!byName[c.name]) byName[c.name] = [];
    byName[c.name].push(c);
  });

  // Delete duplicates and keep oldest
  const deleteIds: string[] = [];
  for (const [name, items] of Object.entries(byName)) {
    if (items.length > 1) {
      console.log(`Duplicates for "${name}": ${items.length} entries`);
      // Keep the first (oldest), delete the rest
      items.slice(1).forEach((item) => deleteIds.push(item.id));
    }
  }

  if (deleteIds.length > 0) {
    console.log(`\nDeleting ${deleteIds.length} duplicate rows...`);
    const { error: deleteError } = await supabase
      .from('expense_categories')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      console.error('Delete failed:', deleteError.message);
      process.exit(1);
    }
    console.log('Duplicates removed.');
  } else {
    console.log('No duplicates found.');
  }

  // Ensure all target categories exist and are active
  console.log('\nEnsuring all 15 categories exist and are active...');
  for (const name of TARGET_CATEGORIES) {
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      if (!existing.is_active) {
        const { error: updateError } = await supabase
          .from('expense_categories')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Failed to activate "${name}":`, updateError.message);
        } else {
          console.log(`Activated "${name}"`);
        }
      } else {
        console.log(`"${name}" already active`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('expense_categories')
        .insert({ name, is_active: true });

      if (insertError) {
        console.error(`Failed to insert "${name}":`, insertError.message);
      } else {
        console.log(`Inserted "${name}"`);
      }
    }
  }

  // Final verification
  console.log('\n--- Final Verification ---');
  const { data: finalCategories, error: finalError } = await supabase
    .from('expense_categories')
    .select('name, is_active')
    .order('name', { ascending: true });

  if (finalError) {
    console.error('Final fetch failed:', finalError.message);
    process.exit(1);
  }

  console.log(`Total unique categories: ${finalCategories?.length ?? 0}`);
  finalCategories?.forEach((c) => console.log(` - ${c.name} (active: ${c.is_active})`));

  const missing = TARGET_CATEGORIES.filter(
    (name) => !finalCategories?.some((c) => c.name === name && c.is_active)
  );

  if (missing.length > 0) {
    console.log(`\nWARNING: Missing or inactive categories: ${missing.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\nAll 15 categories present and active.');
    process.exit(0);
  }
}

cleanupAndFix().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
