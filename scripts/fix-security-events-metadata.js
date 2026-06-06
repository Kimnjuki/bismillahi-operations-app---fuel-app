const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSecurityEventsMetadata() {
  try {
    console.log('Fixing security events metadata...');
    
    // Get all security events
    const { data: events, error: fetchError } = await supabase
      .from('security_events')
      .select('*');

    if (fetchError) {
      console.error('Error fetching security events:', fetchError);
      return;
    }

    if (!events || events.length === 0) {
      console.log('No security events found.');
      return;
    }

    console.log(`Found ${events.length} security events to fix.`);

    // Update each event with proper metadata
    for (const event of events) {
      const updatedMetadata = {
        ...event.metadata,
        fixed_at: new Date().toISOString(),
        version: '1.0'
      };

      const { error: updateError } = await supabase
        .from('security_events')
        .update({ metadata: updatedMetadata })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Error updating event ${event.id}:`, updateError);
      } else {
        console.log(`✅ Fixed metadata for event ${event.id}`);
      }
    }

    console.log('Security events metadata fix completed!');
  } catch (error) {
    console.error('Error fixing security events metadata:', error);
  }
}

fixSecurityEventsMetadata();