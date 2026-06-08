# Comprehensive Fix Plan - BISMILLAHI OPERATIONS

## Priority 1: Database Schema Fixes (SQL - Execute in Supabase Dashboard SQL Editor)
- [ ] Add missing `description`, `severity` columns to `security_events`
- [ ] Add `created_by` to `daily_sales`
- [ ] Add `address`, `transporter_code`, `contact_person`, `email`, `created_by` to `transporters`
- [ ] Add `quantity_liters`, `product`, `isse_vurra_cdf`, `isse_vurra_usd`, `status` to `fuel_deliveries`
- [ ] Add `product`, `current_stock`, `capacity`, `updated_by` to `fuel_stock`
- [ ] Add `created_by` UUID to `exchange_rates`
- [ ] Create `tanks` table (referenced by tankService.ts)
- [ ] Create `dipping_readings` table
- [ ] Create `account_transactions` table

## Priority 2: Code-to-DB Field Name Mismatches
- [ ] **securityService.ts**: `event_data` instead of `metadata` ✅ DONE
- [ ] **accountService.ts**: Map DB columns (`customer_name`/`vendor_name`, `amount_cdf`/`amount_usd`) to app types
- [ ] **fundTransferService.ts**: Map field names
- [ ] **tankService.ts**: Create missing tables first
- [ ] **DashboardScreen.tsx**: Remove `.eq('status', 'pending')` on fund_transfers (no status column)

## Priority 3: Stability & Performance
- [ ] **All screens**: Wrap inline functions in `useCallback`
- [ ] **All FlatLists**: Add `keyExtractor` and stable keys
- [ ] **useEffect**: Fix missing dependencies
- [ ] **Null checks**: Add optional chaining for data access
- [ ] **Offline service**: Fix error handling patterns
- [ ] **SafeAreaView**: Migrate to `react-native-safe-area-context`

## Priority 4: Data Visibility
- [ ] Fix RLS policies to ensure inserted data is visible
- [ ] Add proper select() after insert
- [ ] Verify insert/select/update return patterns

## Priority 5: Loading & Startup
- [ ] Optimize initial data loading
- [ ] Add proper splash screen behavior
- [ ] Fix auth flow timing