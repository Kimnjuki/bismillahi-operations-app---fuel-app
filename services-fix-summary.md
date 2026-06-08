# Schema Mismatch Fix Summary

## Issues Found and Solutions

### 1. security_events
- **DB has**: `event_data` (JSONB), not `metadata` 
- **DB missing**: `description`, `severity`
- **Fix**: Add columns + map `metadata` ↔ `event_data` in code

### 2. daily_sales
- **DB already has**: `created_by` column? No - needs to be added
- **Fix**: Add `created_by` column to daily_sales

### 3. transporters
- **DB missing**: `address`, `transporter_code`, `contact_person`, `email`, `created_by`
- **Fix**: Add these columns

### 4. fuel_deliveries
- **DB missing**: `quantity_liters`, `product`, `isse_vurra_cdf`, `isse_vurra_usd`, `status`, `truck_id`
- **DB has**: `expected_litres`, `actual_received`, `product_id` instead
- **Station relationship**: `station_id` is `text` in fuel_deliveries but `uuid` in stations
- **Fix**: Add columns + fix type conversion

### 5. fuel_stock
- **DB missing**: `product`, `current_stock`, `capacity`, `updated_by`
- **Station relationship**: Same text vs uuid issue
- **Fix**: Add columns + fix type conversion

### 6. exchange_rates
- **DB missing**: `created_by` (UUID)
- **Error "invalid input syntax for type uuid: demo-1"**: Demo users have string IDs like 'demo-1'
- **Fix**: Add column, fix demo user IDs to proper UUID format

## Frontend Service Fixes Needed

### securityService.ts
- Map `metadata` → `event_data` when sending to server

### fuelDeliveryService.ts  
- Add column mapping for fuel_deliveries (product_id → product)
- Add station_id type casting for joins

### syncService.ts
- Already syncs correct fields for daily_sales

## Approach
1. Apply SQL ALTER TABLE statements to add missing columns 
2. Update service code to properly map field names where columns already exist with different names
3. Create views for backward compatibility