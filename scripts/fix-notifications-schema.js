const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNotificationsSchema() {
  try {
    console.log('Checking notifications table schema...');
    
    // First, let's see what columns exist
    const { data: tableInfo, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error accessing notifications table:', tableError);
      return;
    }

    console.log('✅ Notifications table is accessible');
    
    // Try to insert a simple notification to see what columns are missing
    const testNotification = {
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification',
      is_read: false,
      priority: 'low'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select();

    if (insertError) {
      console.error('Insert error details:', insertError);
      
      // If the error is about missing columns, let's try with minimal data
      const minimalNotification = {
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification'
      };

      const { data: minimalData, error: minimalError } = await supabase
        .from('notifications')
        .insert(minimalNotification)
        .select();

      if (minimalError) {
        console.error('Minimal insert also failed:', minimalError);
        console.log('\nPlease check your notifications table schema. Expected columns:');
        console.log('- id (UUID, primary key)');
        console.log('- type (text)');
        console.log('- title (text)');
        console.log('- message (text)');
        console.log('- is_read (boolean, default false)');
        console.log('- priority (text, default "medium")');
        console.log('- station_id (UUID, nullable)');
        console.log('- data (jsonb, nullable)');
        console.log('- created_at (timestamp, default now())');
        console.log('- updated_at (timestamp, default now())');
      } else {
        console.log('✅ Minimal notification inserted successfully');
        console.log('Your table is missing some optional columns, but basic functionality should work.');
      }
    } else {
      console.log('✅ Test notification inserted successfully');
      console.log('Your notifications table schema is correct!');
      
      // Clean up test data
      if (insertData && insertData.length > 0) {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', insertData[0].id);
        console.log('✅ Test data cleaned up');
      }
    }

  } catch (error) {
    console.error('Error checking notifications schema:', error);
  }
}

// Run the check
fixNotificationsSchema();











