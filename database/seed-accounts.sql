-- Seed Platform Accounts
-- Run this after the schema is set up to populate initial accounts
-- Each station gets operating accounts in CDF and USD, plus shared transit accounts

-- First, insert the 6 stations
INSERT INTO stations (station_name, station_code, location, is_active) VALUES
  ('ISSIRO STATION',   'ISS001', 'Issiro, DRC',           true),
  ('DEPOT ISSIRO',     'DEP001', 'Issiro Depot, DRC',     true),
  ('RUNGU STATION',    'RUN001', 'Rungu, DRC',            true),
  ('DURBA STATION',    'DUR001', 'Durba, DRC',            true),
  ('DUNGU STATION',    'DUN001', 'Dungu, DRC',            true),
  ('NIANGARA STATION', 'NIA001', 'Niangara, DRC',         true)
ON CONFLICT (station_code) DO NOTHING;

-- Insert operating accounts (one CDF + one USD per station)
INSERT INTO internal_accounts (account_name, account_code, account_type, station_id, currency, balance, is_active)
SELECT
  s.station_name || ' - Operating (CDF)',
  s.station_code || '_OPS_CDF',
  'operating',
  s.id,
  'CDF',
  0,
  true
FROM stations s
WHERE s.station_code IN ('ISS001','DEP001','RUN001','DUR001','DUN001','NIA001')
ON CONFLICT DO NOTHING;

INSERT INTO internal_accounts (account_name, account_code, account_type, station_id, currency, balance, is_active)
SELECT
  s.station_name || ' - Operating (USD)',
  s.station_code || '_OPS_USD',
  'operating',
  s.id,
  'USD',
  0,
  true
FROM stations s
WHERE s.station_code IN ('ISS001','DEP001','RUN001','DUR001','DUN001','NIA001')
ON CONFLICT DO NOTHING;

-- Insert transit accounts (one per currency, no station association)
INSERT INTO internal_accounts (account_name, account_code, account_type, station_id, currency, balance, is_active) VALUES
  ('ON TRANSIT - CDF', 'TRANSIT_CDF', 'transit', NULL, 'CDF', 0, true),
  ('ON TRANSIT - USD', 'TRANSIT_USD', 'transit', NULL, 'USD', 0, true)
ON CONFLICT DO NOTHING;
