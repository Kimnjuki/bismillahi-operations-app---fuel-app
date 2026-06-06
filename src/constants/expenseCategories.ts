// Expense categories for the BISMILLAHI OPERATIONS app
export const EXPENSE_CATEGORIES = [
  'Generator',
  'Worker\'s fare and lunch',
  'Transport',
  'Cleaning',
  'Communication',
  'Travel expenses',
  'Road use',
  'Repair and maintenance',
  'Vehicle expenses',
  'Home bill',
  'Stationaries',
  'Facilitation fees',
  'Professional fees',
  'Salary',
  'Offloading expenses',
  'Charges and transactions',
  'Discount',
  'Government expenses',
  'Medical',
  'Rent',
  'Sadaqa',
  'Short'
] as const;

// Type for expense categories
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Category icons mapping
export const getCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'generator':
      return 'flash';
    case 'worker\'s fare and lunch':
    case 'salary':
      return 'people';
    case 'transport':
    case 'vehicle expenses':
      return 'car';
    case 'cleaning':
      return 'brush';
    case 'communication':
      return 'call';
    case 'travel expenses':
      return 'airplane';
    case 'road use':
      return 'road';
    case 'repair and maintenance':
      return 'construct';
    case 'home bill':
      return 'home';
    case 'stationaries':
      return 'book';
    case 'facilitation fees':
      return 'handshake';
    case 'professional fees':
      return 'briefcase';
    case 'offloading expenses':
      return 'cube';
    case 'charges and transactions':
      return 'card';
    case 'discount':
      return 'pricetag';
    case 'government expenses':
      return 'business';
    case 'medical':
      return 'medical';
    case 'rent':
      return 'business';
    case 'sadaqa':
      return 'heart';
    case 'short':
      return 'ellipsis-horizontal';
    default:
      return 'receipt';
  }
};

// Category colors mapping
export const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'generator':
      return '#FF6B35';
    case 'worker\'s fare and lunch':
    case 'salary':
      return '#4ECDC4';
    case 'transport':
    case 'vehicle expenses':
      return '#45B7D1';
    case 'cleaning':
      return '#96CEB4';
    case 'communication':
      return '#FFEAA7';
    case 'travel expenses':
      return '#DDA0DD';
    case 'road use':
      return '#98D8C8';
    case 'repair and maintenance':
      return '#F7DC6F';
    case 'home bill':
      return '#BB8FCE';
    case 'stationaries':
      return '#85C1E9';
    case 'facilitation fees':
      return '#F8C471';
    case 'professional fees':
      return '#82E0AA';
    case 'offloading expenses':
      return '#F1948A';
    case 'charges and transactions':
      return '#85C1E9';
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
    case 'short':
      return '#D5DBDB';
    default:
      return '#BDC3C7';
  }
};