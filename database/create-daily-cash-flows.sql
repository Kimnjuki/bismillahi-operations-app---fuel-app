
CREATE TABLE IF NOT EXISTS public.daily_cash_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_name VARCHAR(255) NOT NULL,
  sale_date DATE NOT NULL,
  opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
  cash_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
  short_extra DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(station_name, sale_date)
);

ALTER TABLE public.daily_cash_flows DISABLE ROW LEVEL SECURITY;

CREATE POLICY open_all_daily_cash_flows ON public.daily_cash_flows FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.daily_cash_flows TO anon;
GRANT ALL ON public.daily_cash_flows TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_cash_flows_date_station ON public.daily_cash_flows(sale_date, station_name);

NOTIFY pgrst, 'reload schema';
