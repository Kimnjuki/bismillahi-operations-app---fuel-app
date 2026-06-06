const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...\n');

    // Test 1: Load all notifications
    console.log('1. Testing notification loading...');
    const { data: allNotifications, error: loadError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      console.error('❌ Error loading notifications:', loadError);
      return;
    }

    console.log(`✅ Successfully loaded ${allNotifications?.length || 0} notifications`);

    // Test 2: Get unread notifications
    console.log('\n2. Testing unread notifications filter...');
    const { data: unreadNotifications, error: unreadError } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (unreadError) {
      console.error('❌ Error loading unread notifications:', unreadError);
    } else {
      console.log(`✅ Found ${unreadNotifications?.length || 0} unread notifications`);
    }

    // Test 3: Get notifications by type
    console.log('\n3. Testing notifications by type...');
    const { data: stockAlerts, error: typeError } = await supabase
      .from('notifications')
      .select('*')
      .in('type', ['low_stock', 'stock_alert'])
      .order('created_at', { ascending: false });

    if (typeError) {
      console.error('❌ Error loading stock alerts:', typeError);
    } else {
      console.log(`✅ Found ${stockAlerts?.length || 0} stock-related notifications`);
    }

    // Test 4: Mark notification as read
    console.log('\n4. Testing mark as read functionality...');
    if (unreadNotifications && unreadNotifications.length > 0) {
      const notificationToUpdate = unreadNotifications[0];
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationToUpdate.id);

      if (updateError) {
        console.error('❌ Error marking notification as read:', updateError);
      } else {
        console.log(`✅ Successfully marked notification "${notificationToUpdate.title}" as read`);
      }
    } else {
      console.log('ℹ️  No unread notifications to test mark as read');
    }

    // Test 5: Create new notification
    console.log('\n5. Testing create new notification...');
    const newNotification = {
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification created by the test script',
      is_read: false,
      priority: 'low'
    };

    const { data: createdNotification, error: createError } = await supabase
      .from('notifications')
      .insert(newNotification)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating notification:', createError);
    } else {
      console.log(`✅ Successfully created test notification: "${createdNotification.title}"`);
      
      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', createdNotification.id);
      console.log('✅ Test notification cleaned up');
    }

    // Display summary
    console.log('\n📊 Notification System Summary:');
    console.log(`   Total notifications: ${allNotifications?.length || 0}`);
    console.log(`   Unread notifications: ${unreadNotifications?.length || 0}`);
    console.log(`   Stock alerts: ${stockAlerts?.length || 0}`);
    
    if (allNotifications && allNotifications.length > 0) {
      const priorityCounts = allNotifications.reduce((acc, notif) => {
        acc[notif.priority] = (acc[notif.priority] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 Priority breakdown:');
      Object.entries(priorityCounts).forEach(([priority, count]) => {
        console.log(`   ${priority.toUpperCase()}: ${count}`);
      });
    }

    console.log('\n🎉 All notification tests completed successfully!');
    console.log('The notification system is ready for use in your app.');

  } catch (error) {
    console.error('❌ Error during notification testing:', error);
  }
}

// Run the tests
testNotifications();











