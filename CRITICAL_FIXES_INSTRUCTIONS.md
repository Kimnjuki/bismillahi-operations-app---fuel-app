# Critical Database Fixes - Manual Instructions

## 🚨 IMMEDIATE ACTION REQUIRED

The app is experiencing critical database issues that are preventing proper functionality. Follow these steps immediately to fix the problems.

## Issues Identified

### 1. ✅ UUID Format Issue (FIXED in Code)
- **Problem**: Security service was generating UUIDs with "sec_" prefix
- **Fix Applied**: Updated `src/utils/uuid.ts` to remove the prefix
- **Status**: ✅ FIXED

### 2. ❌ Users Policy Infinite Recursion (BLOCKING ALL OPERATIONS)
- **Problem**: Infinite recursion in users table RLS policies
- **Impact**: Prevents all database operations
- **Status**: ❌ NEEDS MANUAL FIX

### 3. ❌ Missing Database Tables and Columns
- **Problem**: Missing `account_receivables`, `account_payables` tables
- **Problem**: Missing `price_per_liter` column in `daily_sales`
- **Status**: ❌ NEEDS MANUAL FIX

## Manual Fix Instructions

### Step 1: Fix Users Policy (CRITICAL - Do This First)

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/cdexwhsaycfmugseorpq
   - Go to **SQL Editor**

2. **Run This SQL Script**
   ```sql
   -- Fix users policy infinite recursion
   DROP POLICY IF EXISTS users_policy ON users;
   DROP POLICY IF EXISTS users_select_policy ON users;
   DROP POLICY IF EXISTS users_insert_policy ON users;
   DROP POLICY IF EXISTS users_update_policy ON users;
   DROP POLICY IF EXISTS users_delete_policy ON users;
   DROP POLICY IF EXISTS users_simple ON users;

   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   CREATE POLICY users_simple ON users FOR ALL USING (true);
   ```

3. **Verify Fix**
   - Go to **Authentication > Users**
   - Try to view the users list
   - If it loads without errors, the fix worked

### Step 2: Add Missing Database Elements

1. **Run This SQL Script in SQL Editor**
   ```sql
   -- Add missing columns
   ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) DEFAULT 0;

   -- Create missing tables
   CREATE TABLE IF NOT EXISTS account_receivables (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       created_at TIMESTAMP DEFAULT NOW(),
       creditor_name VARCHAR(255),
       creditor_code VARCHAR(100) UNIQUE,
       total_amount DECIMAL(12,2),
       currency VARCHAR(3) DEFAULT 'CDF',
       due_date DATE,
       status VARCHAR(20) DEFAULT 'pending',
       description TEXT,
       created_by UUID
   );

   CREATE TABLE IF NOT EXISTS account_payables (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       created_at TIMESTAMP DEFAULT NOW(),
       debtor_name VARCHAR(255),
       debtor_code VARCHAR(100) UNIQUE,
       total_amount DECIMAL(12,2),
       currency VARCHAR(3) DEFAULT 'CDF',
       due_date DATE,
       status VARCHAR(20) DEFAULT 'pending',
       description TEXT,
       created_by UUID
   );

   -- Enable RLS and create simple policies
   ALTER TABLE account_receivables ENABLE ROW LEVEL SECURITY;
   ALTER TABLE account_payables ENABLE ROW LEVEL SECURITY;

   CREATE POLICY account_receivables_simple ON account_receivables FOR ALL USING (true);
   CREATE POLICY account_payables_simple ON account_payables FOR ALL USING (true);

   -- Force schema refresh
   NOTIFY pgrst, 'reload schema';
   ```

2. **Verify Tables Created**
   - Go to **Table Editor**
   - Check if `account_receivables` and `account_payables` tables exist
   - Check if `daily_sales` table has `price_per_liter` column

### Step 3: Add Sample Data (Optional)

1. **Run This SQL Script to Add Sample Data**
   ```sql
   -- Insert sample account receivables
   INSERT INTO account_receivables (id, creditor_name, creditor_code, total_amount, currency, due_date, status, description) VALUES
       (gen_random_uuid(), 'Creditor A', 'CRD001', 5000000, 'CDF', '2024-07-15', 'overdue', 'Fuel supply payment'),
       (gen_random_uuid(), 'Creditor B', 'CRD002', 2500, 'USD', '2024-07-20', 'pending', 'Equipment maintenance'),
       (gen_random_uuid(), 'Creditor C', 'CRD003', 3000000, 'CDF', '2024-07-25', 'pending', 'Station supplies')
   ON CONFLICT (creditor_code) DO NOTHING;

   -- Insert sample account payables
   INSERT INTO account_payables (id, debtor_name, debtor_code, total_amount, currency, due_date, status, description) VALUES
       (gen_random_uuid(), 'Debtor A', 'DBT001', 2000000, 'CDF', '2024-07-18', 'pending', 'Fuel delivery payment'),
       (gen_random_uuid(), 'Debtor B', 'DBT002', 1500, 'USD', '2024-07-22', 'overdue', 'Service charges'),
       (gen_random_uuid(), 'Debtor C', 'DBT003', 4000000, 'CDF', '2024-07-28', 'pending', 'Equipment purchase')
   ON CONFLICT (debtor_code) DO NOTHING;
   ```

## Verification Steps

### 1. Test Users Table Access
- Go to **Authentication > Users** in Supabase dashboard
- Should load without infinite recursion errors

### 2. Test Account Tables
- Go to **Table Editor > account_receivables**
- Should show the table with sample data
- Go to **Table Editor > account_payables**
- Should show the table with sample data

### 3. Test App Functionality
- Open the app
- Try to navigate to Accounts screen
- Try to view Receivables and Payables
- Should work without database errors

## Expected Results

After applying these fixes:

1. ✅ **UUID Format**: Security events will use proper UUID format (no more "sec_" prefix errors)
2. ✅ **Users Policy**: No more infinite recursion errors
3. ✅ **Database Tables**: Account receivables and payables tables will exist
4. ✅ **Missing Columns**: `daily_sales` table will have `price_per_liter` column
5. ✅ **App Functionality**: Accounts screens will work properly

## Troubleshooting

### If Users Policy Fix Doesn't Work
1. Try disabling RLS completely: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`
2. Test if the table is accessible
3. Re-enable RLS: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`
4. Create a new simple policy

### If Tables Don't Create
1. Check if you have the right permissions
2. Try creating tables one by one
3. Check the SQL Editor for any error messages

### If App Still Shows Errors
1. Restart the Expo development server
2. Clear the app cache
3. Check the console for any remaining error messages

## Files Modified

- ✅ `src/utils/uuid.ts` - Fixed UUID format issue
- ✅ `database/quick-fix.sql` - SQL script for manual fixes
- ✅ `scripts/apply-quick-fixes.js` - Automated fix script (requires manual execution)

## Next Steps

After applying these fixes:

1. **Test the app thoroughly**
2. **Monitor for any remaining errors**
3. **Consider implementing proper RLS policies** (more restrictive than current simple policies)
4. **Add proper error handling** for database operations
5. **Implement data validation** for account creation

## Support

If you encounter any issues:

1. Check the Supabase dashboard logs
2. Check the app console for error messages
3. Verify all SQL scripts executed successfully
4. Test each component individually

The most critical fix is the users policy - this must be done first as it's blocking all database operations.







