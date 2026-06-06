const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cdexwhsaycfmugseorpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw';

const supabase = createClient(supabaseUrl, supabaseKey);

const demoUsers = [
  {
    email: 'admin@bismillahi.com',
    password: 'admin123',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'manager@bismillahi.com',
    password: 'manager123',
    full_name: 'Manager User',
    role: 'manager'
  },
  {
    email: 'cashier@bismillahi.com',
    password: 'cashier123',
    full_name: 'Cashier User',
    role: 'cashier'
  },
  {
    email: 'viewer@bismillahi.com',
    password: 'viewer123',
    full_name: 'Viewer User',
    role: 'viewer'
  }
];

async function setupDemoUsers() {
  console.log('Setting up demo users...');
  
  for (const user of demoUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (authError) {
        console.log(`Auth error for ${user.email}:`, authError.message);
        continue;
      }

      if (authData.user) {
        // Create user profile (simplified for existing schema)
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            full_name: user.full_name,
            role: user.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.log(`Profile error for ${user.email}:`, profileError.message);
        } else {
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        }
      }
    } catch (error) {
      console.log(`Error creating ${user.email}:`, error.message);
    }
  }
  
  console.log('Demo user setup completed!');
}

setupDemoUsers();