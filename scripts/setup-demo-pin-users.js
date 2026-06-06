const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase configuration
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

const demoUsers = [
  {
    user_code: 'ADM001',
    pin: '1234',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    user_code: 'MGR001',
    pin: '5678',
    full_name: 'Manager User',
    role: 'manager'
  },
  {
    user_code: 'CSH001',
    pin: '9999',
    full_name: 'Cashier User',
    role: 'cashier'
  },
  {
    user_code: 'VWR001',
    pin: '0000',
    full_name: 'Viewer User',
    role: 'viewer'
  }
];

// PIN hashing function (same as in the app)
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function setupDemoPinUsers() {
  console.log('Setting up demo PIN users...');
  
  for (const user of demoUsers) {
    try {
      // Create user with PIN
      const { error } = await supabase
        .from('users')
        .insert({
          user_code: user.user_code,
          pin_hash: hashPin(user.pin),
          full_name: user.full_name,
          role: user.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.log(`Error creating ${user.user_code}:`, error.message);
      } else {
        console.log(`✅ Created PIN user: ${user.user_code} (${user.role}) - PIN: ${user.pin}`);
      }
    } catch (error) {
      console.log(`Error creating ${user.user_code}:`, error.message);
    }
  }
  
  console.log('Demo PIN user setup completed!');
}

setupDemoPinUsers();