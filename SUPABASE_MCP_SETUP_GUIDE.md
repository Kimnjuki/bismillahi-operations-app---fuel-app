# Supabase MCP Server Setup Guide

## Current Issues Identified
1. **Invalid API Key**: The service role key in the script is incorrect
2. **Missing Database Schema**: Several tables and columns are missing
3. **RLS Policy Issues**: Users table has infinite recursion in policies
4. **UUID Format Issues**: Security service generating invalid UUIDs

## Step 1: Get Correct Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `cdexwhsaycfmugseorpq`
3. Go to Settings → API
4. Copy the following:
   - **Project URL**: `https://cdexwhsaycfmugseorpq.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw`
   - **service_role secret key**: (You need to get this from your dashboard)

## Step 2: Apply Database Schema Fixes

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database/complete-schema-fix.sql`
3. Execute the script

## Step 3: Fix UUID Issues in Code

The security service is generating invalid UUIDs with "sec_" prefix. This needs to be fixed in the code.

## Step 4: Set Up MCP Server Connection

### Option A: Using Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref cdexwhsaycfmugseorpq
```

### Option B: Using Environment Variables
Create a `.env` file in your project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://cdexwhsaycfmugseorpq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 5: Test Connection

Run the app and check if the database errors are resolved:
```bash
npx expo start
```

## Critical Fixes Required

### 1. Fix UUID Generation
In `src/utils/uuid.ts`, ensure the `generateSecurityId` function returns a pure UUID without prefixes.

### 2. Fix Database Schema
Execute the SQL script in `database/complete-schema-fix.sql` in your Supabase SQL Editor.

### 3. Fix Users Policy
The users table RLS policy has infinite recursion. The SQL script will fix this.

### 4. Add Missing Tables
The script will create:
- `account_receivables`
- `account_payables` 
- `account_transactions`
- `internal_accounts`
- `stations`

## Verification Steps

1. Check that all tables exist in Supabase Dashboard → Table Editor
2. Verify RLS policies are working
3. Test the app functionality
4. Check for any remaining errors in the console

## Next Steps After Fixes

1. Test the accounts management feature
2. Verify receivables and payables functionality
3. Test the new AccountsManagementScreen
4. Ensure all navigation works correctly







