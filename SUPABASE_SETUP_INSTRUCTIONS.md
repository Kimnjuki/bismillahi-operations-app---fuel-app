# Supabase Setup Instructions

## Current Status
✅ **MCP Server**: Fixed and running  
✅ **App Configuration**: Supabase client configured correctly  
✅ **Dependencies**: All packages installed  
⚠️ **Database Schema**: Needs manual setup in Supabase dashboard  

## Manual Database Setup Required

Since the automated scripts cannot execute SQL directly, you need to manually apply the database schema in your Supabase dashboard.

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `cdexwhsaycfmugseorpq`

### Step 2: Open SQL Editor
1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New Query"**

### Step 3: Execute Schema Fix
Copy and paste the entire contents of `database/complete-schema-fix.sql` into the SQL editor and click **"Run"**.

### Step 4: Verify Tables
After running the SQL, verify these tables exist:
- `users`
- `daily_sales`
- `security_events`
- `account_receivables`
- `account_payables`
- `notifications`
- `expenses`
- `stock_items`

## Demo Users Available

The app includes demo users for testing:

| User Code | PIN | Role | Name |
|-----------|-----|------|------|
| A001 | 1234 | Admin | Admin User |
| A002 | 1234 | Manager | Manager User |
| A003 | 1234 | Cashier | Cashier User |
| A004 | 1234 | Viewer | Viewer User |

## Testing the App

1. **Start the app**: `npx expo start`
2. **Login**: Use any demo user code and PIN 1234
3. **Test features**: Navigate through different screens to verify functionality

## Current App Features

✅ **Authentication**: PIN-based login with demo users  
✅ **Navigation**: Complete screen navigation  
✅ **Offline Support**: Local data caching  
✅ **Notifications**: Mock notification system  
✅ **Sales Management**: Sales entry and tracking  
✅ **Stock Management**: Inventory tracking  
✅ **Expense Management**: Expense tracking  
✅ **Reports**: Daily and consolidated reports  
✅ **User Management**: Role-based access control  
✅ **Security**: Security monitoring and logging  

## Troubleshooting

### If the app doesn't start:
1. Check that all dependencies are installed: `npm install`
2. Clear Expo cache: `npx expo start --clear`
3. Check for TypeScript errors: `npx tsc --noEmit`

### If database operations fail:
1. Verify the schema was applied correctly in Supabase dashboard
2. Check that RLS policies are properly configured
3. Ensure the service role key is correct

### If MCP server shows errors:
1. Check the MCP configuration in `~/.cursor/mcp.json`
2. Verify the Supabase credentials are correct
3. Restart Cursor to reload MCP configuration

## Next Steps

1. **Apply the database schema** manually in Supabase dashboard
2. **Test the app** with demo users
3. **Customize** the app for your specific petroleum operations needs
4. **Add real users** through the admin interface
5. **Configure** notifications and reporting as needed

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify Supabase connection in the dashboard
3. Test with demo users first
4. Review the database schema and policies
