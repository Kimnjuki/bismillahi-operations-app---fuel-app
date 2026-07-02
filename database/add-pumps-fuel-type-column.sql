-- Add missing fuel_type column to the pumps table
ALTER TABLE IF EXISTS public.pumps 
    ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'PMS',
    ADD COLUMN IF NOT EXISTS pump_number INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS station_id UUID,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';