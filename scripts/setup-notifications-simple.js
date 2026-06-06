const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample notifications data (without data column)
const sampleNotifications = [
  {
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'PMS stock is running low at ISSIRO STATION. Current level: 500L',
    is_read: false,
    priority: 'high'
  },
  {
    type: 'payment_received',
    title: 'Payment Received',
    message: 'Payment of $2,500 received for fuel delivery to DEPOT ISSIRO',
    is_read: false,
    priority: 'medium'
  },
  {
    type: 'fuel_delivery',
    title: 'Fuel Delivery Scheduled',
    message: 'Fuel delivery scheduled for tomorrow at RUNGU STATION. Expected: 10,000L PMS',
    is_read: false,
    priority: 'medium'
  },
  {
    type: 'stock_alert',
    title: 'Stock Variance Detected',
    message: 'Stock variance detected at DUNGU STATION. Difference: -50L AGO',
    is_read: true,
    priority: 'medium'
  },
  {
    type: 'payment_due',
    title: 'Payment Due Reminder',
    message: 'Payment of $1,800 is due for fuel delivery to DURBA STATION',
    is_read: false,
    priority: 'high'
  },
  {
    type: 'low_stock',
    title: 'Critical Stock Alert',
    message: 'AGO stock is critically low at NIANGARA STATION. Current level: 100L',
    is_read: false,
    priority: 'high'
  },
  {
    type: 'payment_received',
    title: 'Payment Confirmed',
    message: 'Payment of $3,200 confirmed for bulk fuel order at DURBA STATION',
    is_read: true,
    priority: 'medium'
  },
  {
    type: 'fuel_delivery',
    title: 'Delivery Completed',
    message: 'Fuel delivery completed at DEPOT ISSIRO. Delivered: 15,000L PMS',
    is_read: false,
    priority: 'low'
  }
];

async function setupNotifications() {
  try {
    console.log('Setting up notifications table with sample data...');
    
    // Clear existing notifications
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .neq('type', '');

    if (deleteError) {
      console.log('Note: Could not clear existing notifications:', deleteError.message);
    } else {
      console.log('✅ Cleared existing notifications');
    }

    // Insert sample notifications
    const { data: insertedData, error: insertError } = await supabase
      .from('notifications')
      .insert(sampleNotifications)
      .select();

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedData?.length || 0} sample notifications`);

    // Verify the data was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('Error verifying notifications:', verifyError);
      return;
    }

    console.log(`✅ Verification: Found ${verifyData?.length || 0} notifications in database`);
    
    if (verifyData && verifyData.length > 0) {
      console.log('\nSample notifications:');
      verifyData.slice(0, 5).forEach((notification, index) => {
        console.log(`${index + 1}. [${notification.priority?.toUpperCase()}] ${notification.title}`);
        console.log(`   ${notification.message}`);
        console.log(`   Read: ${notification.is_read ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    console.log('🎉 Notifications setup completed successfully!');
    console.log('You can now test the notification system in your app.');

  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
}

// Run the setup
setupNotifications();











