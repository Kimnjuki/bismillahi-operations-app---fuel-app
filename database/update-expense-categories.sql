-- Update expense categories to match the new list
-- First, clear existing categories
DELETE FROM expense_categories;

-- Insert the new expense categories
INSERT INTO expense_categories (name, description) VALUES
('Generator', 'Generator fuel, maintenance, and related expenses'),
('Worker\'s fare and lunch', 'Transportation and meal allowances for workers'),
('Transport', 'General transportation expenses'),
('Cleaning', 'Cleaning supplies and services'),
('Communication', 'Phone bills, internet, and communication services'),
('Travel expenses', 'Business travel and accommodation costs'),
('Road use', 'Road maintenance and usage fees'),
('Repair and maintenance', 'Equipment and facility repairs'),
('Vehicle expenses', 'Vehicle maintenance, fuel, and related costs'),
('Home bill', 'Home utility bills and expenses'),
('Stationaries', 'Office supplies and stationery'),
('Facilitation fees', 'Facilitation and service fees'),
('Professional fees', 'Legal, accounting, and professional services'),
('Salary', 'Employee salaries and wages'),
('Offloading expenses', 'Loading and unloading costs'),
('Charges and transactions', 'Bank charges and transaction fees'),
('Discount', 'Discounts and rebates given'),
('Government expenses', 'Government fees, taxes, and compliance costs'),
('Medical', 'Medical expenses and health-related costs'),
('Rent', 'Rental payments for facilities and equipment'),
('Sadaqa', 'Charitable donations and religious contributions'),
('Short', 'Short-term or miscellaneous expenses');

-- Update the expenses table to ensure it can handle all categories
ALTER TABLE expenses 
ALTER COLUMN category TYPE VARCHAR(100);

-- Create an index on the category column for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_category_new ON expenses(category);











