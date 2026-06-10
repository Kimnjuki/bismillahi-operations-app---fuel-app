import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render, createMockUser } from '../utils/testUtils';
import SalesEntryScreen from '../../src/screens/SalesEntryScreen';

// Mock the auth context - using jest.requireActual to access the import inside mock factory
jest.mock('../../src/context/AuthContext', () => {
  const { createMockUser: mockUserFactory } = jest.requireActual('../utils/testUtils');
  return {
    useAuth: () => ({
      appUser: mockUserFactory(),
      hasPermission: jest.fn(() => true),
    }),
  };
});

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

describe('SalesEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pump sales form by default', () => {
    const { getByText } = render(<SalesEntryScreen />);
    
    expect(getByText('Pump Sales Entry')).toBeTruthy();
    expect(getByText('Pump Number')).toBeTruthy();
    expect(getByText('Fuel Type')).toBeTruthy();
  });

  it('should switch to drum sales form when drum tab is pressed', () => {
    const { getByText } = render(<SalesEntryScreen />);
    
    const drumTab = getByText('Drum Sales');
    fireEvent.press(drumTab);
    
    expect(getByText('Drum Sales Entry')).toBeTruthy();
    expect(getByText('Drum Type')).toBeTruthy();
    expect(getByText('Quantity')).toBeTruthy();
  });

  it('should switch back to pump sales form when pump tab is pressed', () => {
    const { getByText } = render(<SalesEntryScreen />);
    
    // Switch to drum sales first
    const drumTab = getByText('Drum Sales');
    fireEvent.press(drumTab);
    
    // Switch back to pump sales
    const pumpTab = getByText('Pump Sales');
    fireEvent.press(pumpTab);
    
    expect(getByText('Pump Sales Entry')).toBeTruthy();
  });

  it('should show validation errors for empty required fields', async () => {
    const { getByText } = render(<SalesEntryScreen />);
    
    const submitButton = getByText('Record Pump Sale');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(getByText('Pump number must be between 1 and 20')).toBeTruthy();
    });
  });
});