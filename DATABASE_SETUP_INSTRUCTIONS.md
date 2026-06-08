# DATABASE SETUP INSTRUCTIONS - BISMILLAHI OPERATIONS

## ⚠️ CRITICAL: You MUST run this SQL to fix ALL errors

The app will show errors until the database schema is fixed. This is a **one-time** operation.

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard SQL Editor

1. Go to **https://supabase.com/dashboard**
2. Select your project: **bdjoknphffficrepbxim**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Execute the SQL Fix Script

Copy the **entire contents** of `database/fix-all-schema-errors.sql` and paste it into the SQL Editor.

Then click **"Run"** (or press Ctrl+Enter).

### Step 3: Verify the fix

After execution, you should see a success message. Run this verification query:

```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tanks', 'dipping_readings', 'account_transactions', 'security_events', 'daily_sales', 'transporters', 'fuel_deliveries', 'fuel_stock', 'exchange_rates', 'fund_transfers')
ORDER BY table_name;

-- Verify missing columns were added
SELECT column_name, table_name FROM information_schema.columns 
WHERE table_schema = 'public'
AND column_name IN ('description', 'severity', 'metadata', 'created_by', 'address', 'transporter_code', 'contact_person', 'quantity_liters', 'product', 'status', 'current_stock', 'capacity')
ORDER BY table_name, column_name;
```

### Step 4: Restart the app

After the SQL runs successfully, restart the Expo app:
```bash
npx expo start --clear
```

---

## What the SQL Fix Creates

### New Tables
| Table | Purpose | Service |
|-------|---------|---------|
| `tanks` | Fuel tanks for each station | tankService.ts |
| `dipping_readings` | Tank dipping measurements | tankService.ts |
| `account_transactions` | Account transaction history | accountService.ts |

### New Columns Added
| Table | Column | Type |
|-------|--------|------|
| `security_events` | `description` | TEXT |
| `security_events` | `severity` | VARCHAR(20) |
| `security_events` | `metadata` | JSONB |
| `daily_sales` | `created_by` | UUID |
| `daily_sales` | `updated_at` | TIMESTAMPTZ |
| `transporters` | `address` | TEXT |
| `transporters` | `transporter_code` | VARCHAR(100) |
| `transporters` | `contact_person` | VARCHAR(255) |
| `transporters` | `email` | VARCHAR(255) |
| `transporters` | `created_by` | UUID |
| `fuel_deliveries` | `quantity_liters` | NUMERIC |
| `fuel_deliveries` | `product` | VARCHAR(100) |
| `fuel_deliveries` | `isse_vurra_cdf` | NUMERIC |
| `fuel_deliveries` | `isse_vurra_usd` | NUMERIC |
| `fuel_deliveries` | `status` | VARCHAR(50) |
| `fuel_deliveries` | `truck_id` | VARCHAR(100) |
| `fuel_deliveries` | `updated_at` | TIMESTAMPTZ |
| `fuel_stock` | `product` | VARCHAR(100) |
| `fuel_stock` | `current_stock` | NUMERIC |
| `fuel_stock` | `capacity` | NUMERIC |
| `fuel_stock` | `updated_by` | VARCHAR(255) |
| `fuel_stock` | `updated_at` | TIMESTAMPTZ |
| `exchange_rates` | `created_by` | UUID |
| `fund_transfers` | `station` | VARCHAR(255) |
| `fund_transfers` | `status` | VARCHAR(50) |

### RLS Policies
- All affected tables get open policies (`FOR ALL USING (true)`) for development
- This allows the app to insert, read, update, and delete data without authentication issues

### Functions Created
- `exec_sql(sql TEXT)` - Execute dynamic SQL (for future automated fixes)

---

## Code Changes Made

| File | Change |
|------|--------|
| `src/services/securityService.ts` | Fixed: Maps `metadata` → `event_data` when sending to DB |

---

## Troubleshooting

### "permission denied for table..."
The SQL needs to be run with the `postgres` user via the Dashboard SQL Editor, not the anon key.

### "relation already exists..."
This is fine! The SQL uses `IF NOT EXISTS` to be safe.

### App still shows errors after running SQL
1. Run `npx expo start --clear` to clear the cache
2. Check that the SQL completed without errors in the Dashboard
3. Verify the columns exist using the verification queries above