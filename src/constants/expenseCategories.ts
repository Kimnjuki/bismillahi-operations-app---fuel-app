// Expense categories for the BISMILLAHI OPERATIONS app
export const EXPENSE_CATEGORIES = [
  'Generator',
  "Workers' fare and lunch",
  'Security',
  'Transport',
  'Government expenses',
  'Offloading expenses',
  'Medical',
  'Travel expenses',
  'Communication',
  'Salary',
  'Stationaries',
  'Discount',
  'Sadaqa',
  'Repair and Maintenance',
  'Rent'
] as const;

// Type for expense categories
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Category icons mapping
export const getCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'generator':
      return 'flash';
    case "workers' fare and lunch":
    case 'salary':
      return 'account-group';
    case 'security':
      return 'shield';
    case 'transport':
      return 'car';
    case 'communication':
      return 'phone';
    case 'travel expenses':
      return 'airplane';
    case 'repair and maintenance':
      return 'toolbox';
    case 'stationaries':
      return 'book';
    case 'offloading expenses':
      return 'cube';
    case 'discount':
      return 'tag';
    case 'government expenses':
    case 'rent':
      return 'domain';
    case 'medical':
      return 'medical-bag';
    case 'sadaqa':
      return 'heart';
    default:
      return 'receipt';
  }
};

// Category colors mapping
export const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'generator':
      return '#FF6B35';
    case "workers' fare and lunch":
    case 'salary':
      return '#4ECDC4';
    case 'security':
      return '#9B59B6';
    case 'transport':
      return '#45B7D1';
    case 'communication':
      return '#FFEAA7';
    case 'travel expenses':
      return '#DDA0DD';
    case 'repair and maintenance':
      return '#F7DC6F';
    case 'stationaries':
      return '#85C1E9';
    case 'offloading expenses':
      return '#F1948A';
    case 'discount':
      return '#F7DC6F';
    case 'government expenses':
      return '#D7DBDD';
    case 'medical':
      return '#F1948A';
    case 'rent':
      return '#A9DFBF';
    case 'sadaqa':
      return '#F8C471';
    default:
      return '#BDC3C7';
  }
};