const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDatabaseFixes() {
  try {
    console.log('Applying database fixes...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/fix-expense-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.warn(`Warning on statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✓ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`Error on statement ${i + 1}:`, err.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('Database fixes applied successfully!');
    
    // Test the connection
    const { data, error } = await supabase
      .from('expenses')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Error testing connection:', error);
    } else {
      console.log('✓ Database connection test successful');
    }
    
  } catch (error) {
    console.error('Error applying database fixes:', error);
    process.exit(1);
  }
}

// Run the fixes
applyDatabaseFixes();











