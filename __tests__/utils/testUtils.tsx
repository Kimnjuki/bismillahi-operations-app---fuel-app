import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../../src/context/AuthContext';

// Mock navigation container for testing
const MockNavigationContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>
      <MockNavigationContainer>
        {children}
      </MockNavigationContainer>
    </AuthProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'cashier' as const,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockPumpSale = (overrides = {}) => ({
  id: 'test-pump-sale-id',
  pump_number: 1,
  fuel_type: 'Petrol' as const,
  volume_liters: 50.0,
  price_per_liter: 500.0,
  total_amount: 25000.0,
  payment_method: 'cash' as const,
  sale_date: '2024-01-01',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockDrumSale = (overrides = {}) => ({
  id: 'test-drum-sale-id',
  drum_type: '200L Drum' as const,
  quantity: 2,
  price_per_drum: 100000.0,
  total_amount: 200000.0,
  payment_method: 'card' as const,
  sale_date: '2024-01-01',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStockItem = (overrides = {}) => ({
  id: 'test-stock-item-id',
  item_name: 'Test Item',
  category: 'Fuel',
  unit: 'Liters',
  current_stock: 1000.0,
  minimum_stock: 100.0,
  cost_price: 400.0,
  selling_price: 500.0,
  last_updated: '2024-01-01T00:00:00Z',
  updated_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockExpense = (overrides = {}) => ({
  id: 'test-expense-id',
  category: 'Maintenance',
  subcategory: 'Equipment',
  amount: 5000.0,
  description: 'Test expense',
  receipt_number: 'RCP-001',
  payment_method: 'cash' as const,
  expense_date: '2024-01-01',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'info' as const,
  user_id: 'test-user-id',
  is_read: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock functions
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  dispatch: jest.fn(),
  getState: jest.fn(() => ({ index: 0, routes: [{ name: 'Test' }] })),
});

export const createMockRoute = (params = {}) => ({
  params,
  key: 'test-key',
  name: 'Test',
});

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};

export const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  })),
  removeChannel: jest.fn(),
};

// Re-export everything from testing library
export * from '@testing-library/react-native';
export { customRender as render };

