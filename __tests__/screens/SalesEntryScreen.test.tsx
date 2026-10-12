import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '../utils/testUtils';
import SalesEntryScreen from '../../src/screens/SalesEntryScreen';

// Mock the auth context. Define the mock user inline to avoid a circular
// dependency through testUtils (which imports AuthContext, which is mocked here).
const mockAppUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'cashier' as const,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    appUser: mockAppUser,
    hasPermission: jest.fn(() => true),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

describe('SalesEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the batch pump sales form by default', () => {
    const { getByText, getAllByText } = render(<SalesEntryScreen />);
    // Header + core labels present in the current batch-sales UI
    expect(getByText('Batch Sales Entry')).toBeTruthy();
    expect(getByText('Customer')).toBeTruthy();
    expect(getByText('Payment')).toBeTruthy();
    expect(getByText('Ref No')).toBeTruthy();
    // "Station" appears both as an info label and a per-transaction field label
    expect(getAllByText('Station').length).toBeGreaterThan(0);
    // The default transaction card is a pump sale
    expect(getByText('PUMP SALE')).toBeTruthy();
    expect(getByText('Volume (Liters)')).toBeTruthy();
    expect(getByText('Price/Liter (CDF)')).toBeTruthy();
    // Action buttons
    expect(getByText('Submit Batch (1 transactions)')).toBeTruthy();
    expect(getByText('Save Draft')).toBeTruthy();
    expect(getByText('Print')).toBeTruthy();
  });

  it('should add another pump transaction when "Add Pump Transaction" is pressed', () => {
    const { getByText } = render(<SalesEntryScreen />);
    // Starts with a single transaction
    expect(getByText('Submit Batch (1 transactions)')).toBeTruthy();

    fireEvent.press(getByText('Add Pump Transaction'));

    // After adding, the submit button reflects two transactions
    expect(getByText('Submit Batch (2 transactions)')).toBeTruthy();
  });

  it('should submit the batch and report success', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    const { getByText } = render(<SalesEntryScreen />);

    // The default transaction already has a pump attendant assigned,
    // so submitting the batch should succeed.
    fireEvent.press(getByText('Submit Batch (1 transactions)'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Batch Submitted Successfully',
        expect.stringContaining('Transactions: 1')
      );
    });

    alertSpy.mockRestore();
  });
});
