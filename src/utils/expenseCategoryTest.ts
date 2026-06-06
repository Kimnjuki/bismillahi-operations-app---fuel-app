import { EXPENSE_CATEGORIES, getCategoryIcon, getCategoryColor } from '../constants/expenseCategories';

// Test function to verify all expense categories are properly configured
export const testExpenseCategories = () => {
  console.log('Testing Expense Categories...');
  
  // Test 1: Verify all categories are present
  const expectedCategories = [
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
  ];
  
  console.log(`Expected categories: ${expectedCategories.length}`);
  console.log(`Actual categories: ${EXPENSE_CATEGORIES.length}`);
  
  // Check if all expected categories are present
  const missingCategories = expectedCategories.filter(cat => !EXPENSE_CATEGORIES.includes(cat as any));
  const extraCategories = EXPENSE_CATEGORIES.filter(cat => !expectedCategories.includes(cat));
  
  if (missingCategories.length > 0) {
    console.error('Missing categories:', missingCategories);
  }
  
  if (extraCategories.length > 0) {
    console.warn('Extra categories:', extraCategories);
  }
  
  // Test 2: Verify all categories have icons
  const categoriesWithoutIcons = EXPENSE_CATEGORIES.filter(cat => {
    const icon = getCategoryIcon(cat);
    return icon === 'receipt'; // Default icon
  });
  
  if (categoriesWithoutIcons.length > 0) {
    console.warn('Categories using default icon:', categoriesWithoutIcons);
  }
  
  // Test 3: Verify all categories have colors
  const categoriesWithoutColors = EXPENSE_CATEGORIES.filter(cat => {
    const color = getCategoryColor(cat);
    return color === '#BDC3C7'; // Default color
  });
  
  if (categoriesWithoutColors.length > 0) {
    console.warn('Categories using default color:', categoriesWithoutColors);
  }
  
  // Test 4: Display all categories with their icons and colors
  console.log('\nAll Expense Categories:');
  EXPENSE_CATEGORIES.forEach((category, index) => {
    const icon = getCategoryIcon(category);
    const color = getCategoryColor(category);
    console.log(`${index + 1}. ${category} (${icon}, ${color})`);
  });
  
  console.log('\nExpense Categories Test Complete!');
  
  return {
    totalCategories: EXPENSE_CATEGORIES.length,
    missingCategories,
    extraCategories,
    categoriesWithoutIcons,
    categoriesWithoutColors
  };
};

// Export for use in development
export default testExpenseCategories;











