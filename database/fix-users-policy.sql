-- Fix Users Policy Infinite Recursion
-- This is the most critical fix needed

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS users_simple ON users;

-- Step 2: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a simple, non-recursive policy
CREATE POLICY users_simple ON users FOR ALL USING (true);

-- Step 5: Verify the fix
-- This should return without infinite recursion error
SELECT COUNT(*) FROM users;







