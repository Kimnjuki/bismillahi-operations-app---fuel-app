/*******************************************************
 * Fuelr Database Migration
 * Adds station link, account type, and Gasnet Energy
 *******************************************************/

-- 1. Add station link to tax payments
ALTER TABLE tax_payments 
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- 2. Add deducted account type for tax payments
ALTER TABLE tax_payments 
  ADD COLUMN IF NOT EXISTS deducted_account_type VARCHAR(3) DEFAULT 'CDF';

-- 3. Ensure Gasnet Energy transporter exists
INSERT INTO transporters (transporter_name, transporter_code, contact_person, phone, license_number, created_by)
SELECT 'Gasnet Energy', 'GE001', 'Gasnet Admin', '+243000000000', 'LIC-GE-001', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM transporters WHERE transporter_name = 'Gasnet Energy');

-- 4. Ensure Gasnet Energy is active
UPDATE transporters 
SET is_active = true 
WHERE transporter_name = 'Gasnet Energy';
UPDATE transporters 
SET name = transporter_name 
WHERE name IS NULL;

-- 5. Add index for faster tax payment lookups by station
CREATE INDEX IF NOT EXISTS idx_tax_payments_station ON tax_payments(station_id);
