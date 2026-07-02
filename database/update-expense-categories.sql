-- Update expense categories to match the new list
INSERT INTO expense_categories (name, description) VALUES
('Generator', 'Generator fuel, maintenance, and related expenses'),
('Workers'' fare and lunch', 'Transportation and meal allowances for workers'),
('Security', 'Security services and equipment'),
('Transport', 'General transportation and logistics expenses'),
('Government expenses', 'Government fees, taxes, and compliance costs'),
('Offloading expenses', 'Loading, unloading, and handling expenses'),
('Medical', 'Medical and health-related expenses'),
('Travel expenses', 'Business travel and accommodation costs'),
('Communication', 'Phone, internet, and communication services'),
('Salary', 'Employee salaries and wages'),
('Stationaries', 'Office stationery and supplies'),
('Discount', 'Discounts, rebates, and allowances'),
('Sadaqa', 'Charitable donations and religious contributions'),
('Repair and Maintenance', 'Equipment and facility repair and maintenance'),
('Rent', 'Facility and equipment rental expenses')
ON CONFLICT (name) DO NOTHING;

-- Update the expenses table to ensure it can handle all categories
ALTER TABLE expenses 
ALTER COLUMN category TYPE VARCHAR(100);

-- Create an index on the category column for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_category_new ON expenses(category);











