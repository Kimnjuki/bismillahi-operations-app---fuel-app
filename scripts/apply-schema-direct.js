const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY4MzE3OSwiZXhwIjoyMDczMjU5MTc5fQ.rX-ygxLMlHEZ-NuZAsBN9HAQ3DDR8qJ7BQ2xM13iRSM';

async function applySchemaDirect() {
  console.log('Starting direct schema application...');
  
  try {
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/complete-schema-fix.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('SQL content loaded, applying fixes...');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement using direct SQL execution
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use the REST API to execute SQL directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error in statement ${i + 1}:`, errorText);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Exception in statement ${i + 1}:`, err.message);
        // Continue with next statement
      }
    }
    
    console.log('\nSchema fix completed!');
    console.log('\nNext steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/complete-schema-fix.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Refresh your app to see the changes');
    
  } catch (error) {
    console.error('Error applying schema fix:', error);
    console.log('\nManual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/complete-schema-fix.sql');
    console.log('4. Execute the SQL script');
  }
}

// Run the fix
applySchemaDirect().catch(console.error);
