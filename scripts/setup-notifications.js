const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample notifications data
const sampleNotifications = [
  {
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'PMS stock is running low at ISSIRO STATION. Current level: 500L',
    is_read: false,
    priority: 'high',
    station_id: null, // Will be set based on station
    data: JSON.stringify({
      product: 'PMS',
      current_stock: 500,
      minimum_threshold: 1000,
      station: 'ISSIRO STATION'
    })
  },
  {
    type: 'payment_received',
    title: 'Payment Received',
    message: 'Payment of $2,500 received for fuel delivery to DEPOT ISSIRO',
    is_read: false,
    priority: 'medium',
    station_id: null,
    data: JSON.stringify({
      amount: 2500,
      currency: 'USD',
      station: 'DEPOT ISSIRO',
      payment_method: 'bank_transfer'
    })
  },
  {
    type: 'fuel_delivery',
    title: 'Fuel Delivery Scheduled',
    message: 'Fuel delivery scheduled for tomorrow at RUNGU STATION. Expected: 10,000L PMS',
    is_read: false,
    priority: 'medium',
    station_id: null,
    data: JSON.stringify({
      product: 'PMS',
      quantity: 10000,
      station: 'RUNGU STATION',
      delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  },
  {
    type: 'stock_alert',
    title: 'Stock Variance Detected',
    message: 'Stock variance detected at DUNGU STATION. Difference: -50L AGO',
    is_read: true,
    priority: 'medium',
    station_id: null,
    data: JSON.stringify({
      product: 'AGO',
      variance: -50,
      station: 'DUNGU STATION',
      expected_stock: 2000,
      actual_stock: 1950
    })
  },
  {
    type: 'payment_due',
    title: 'Payment Due Reminder',
    message: 'Payment of $1,800 is due for fuel delivery to DURBA STATION',
    is_read: false,
    priority: 'high',
    station_id: null,
    data: JSON.stringify({
      amount: 1800,
      currency: 'USD',
      station: 'DURBA STATION',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    })
  }
];

async function setupNotifications() {
  try {
    console.log('Setting up notifications table...');
    
    // First, let's check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error accessing notifications table:', tableError);
      console.log('Please ensure the notifications table exists in your database.');
      return;
    }

    console.log('✅ Notifications table is accessible');

    // Clear existing notifications (optional - remove this if you want to keep existing data)
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .neq('type', ''); // Delete all records

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
      verifyData.slice(0, 3).forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.title} - ${notification.message}`);
      });
    }

    console.log('\n🎉 Notifications setup completed successfully!');
    console.log('You can now test the notification system in your app.');

  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
}

// Run the setup
setupNotifications();
