-- Create Admin User Script
-- Run this AFTER setting up the database tables

-- First, create a user in Supabase Auth (do this through the Supabase dashboard)
-- Go to Authentication > Users > Add User
-- Email: admin@bismillahi.com
-- Password: Admin123! (or your preferred password)
-- Auto Confirm User: Yes

-- Then run this script to add the user to your users table
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from the auth.users table

-- Get the admin user ID from auth.users table
-- You can find this in Supabase Dashboard > Authentication > Users
-- Copy the UUID of the admin user you just created

-- Insert admin user into users table
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID
INSERT INTO users (id, email, full_name, role, is_active) 
VALUES (
  'YOUR_ADMIN_USER_ID', 
  'admin@bismillahi.com', 
  'System Administrator', 
  'admin', 
  true
)
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Verify the user was created
SELECT * FROM users WHERE role = 'admin';
