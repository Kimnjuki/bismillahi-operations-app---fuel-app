import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '../utils/testUtils';
import SalesEntryScreen from '../../src/screens/SalesEntryScreen';
import { createMockUser } from '../utils/testUtils';

// Mock the auth context
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    appUser: createMockUser(),
    hasPermission: jest.fn(() => true),
  }),
}));

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

  it('should update pump number input', () => {
    const { getByDisplayValue } = render(<SalesEntryScreen />);
    
    const pumpNumberInput = getByDisplayValue('');
    fireEvent.changeText(pumpNumberInput, '5');
    
    expect(pumpNumberInput.props.value).toBe('5');
  });

  it('should update volume input', () => {
    const { getByDisplayValue } = render(<SalesEntryScreen />);
    
    const volumeInput = getByDisplayValue('');
    fireEvent.changeText(volumeInput, '100.5');
    
    expect(volumeInput.props.value).toBe('100.5');
  });

  it('should update price per liter input', () => {
    const { getByDisplayValue } = render(<SalesEntryScreen />);
    
    const priceInput = getByDisplayValue('');
    fireEvent.changeText(priceInput, '500.0');
    
    expect(priceInput.props.value).toBe('500.0');
  });

  it('should calculate total amount correctly for pump sales', () => {
    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Set volume and price
    const volumeInput = getByDisplayValue('');
    const priceInput = getByDisplayValue('');
    
    fireEvent.changeText(volumeInput, '50');
    fireEvent.changeText(priceInput, '500');
    
    // Check if total is calculated (this depends on the implementation)
    // The total should be 50 * 500 = 25000
    expect(getByText('₦25,000')).toBeTruthy();
  });

  it('should update drum quantity input', () => {
    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Switch to drum sales
    const drumTab = getByText('Drum Sales');
    fireEvent.press(drumTab);
    
    const quantityInput = getByDisplayValue('');
    fireEvent.changeText(quantityInput, '3');
    
    expect(quantityInput.props.value).toBe('3');
  });

  it('should update price per drum input', () => {
    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Switch to drum sales
    const drumTab = getByText('Drum Sales');
    fireEvent.press(drumTab);
    
    const priceInput = getByDisplayValue('');
    fireEvent.changeText(priceInput, '100000');
    
    expect(priceInput.props.value).toBe('100000');
  });

  it('should calculate total amount correctly for drum sales', () => {
    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Switch to drum sales
    const drumTab = getByText('Drum Sales');
    fireEvent.press(drumTab);
    
    // Set quantity and price
    const quantityInput = getByDisplayValue('');
    const priceInput = getByDisplayValue('');
    
    fireEvent.changeText(quantityInput, '2');
    fireEvent.changeText(priceInput, '100000');
    
    // Check if total is calculated (this depends on the implementation)
    // The total should be 2 * 100000 = 200000
    expect(getByText('₦200,000')).toBeTruthy();
  });

  it('should show validation errors for empty required fields', async () => {
    const { getByText } = render(<SalesEntryScreen />);
    
    const submitButton = getByText('Record Pump Sale');
    fireEvent.press(submitButton);
    
    // Should show validation errors (this depends on the implementation)
    await waitFor(() => {
      expect(getByText('Pump number must be between 1 and 20')).toBeTruthy();
    });
  });

  it('should show success modal after successful submission', async () => {
    // Mock successful Supabase response
    const mockSupabase = require('@supabase/supabase-js');
    mockSupabase.createClient().from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Fill in required fields
    const pumpNumberInput = getByDisplayValue('');
    const volumeInput = getByDisplayValue('');
    const priceInput = getByDisplayValue('');
    
    fireEvent.changeText(pumpNumberInput, '1');
    fireEvent.changeText(volumeInput, '50');
    fireEvent.changeText(priceInput, '500');
    
    const submitButton = getByText('Record Pump Sale');
    fireEvent.press(submitButton);
    
    // Should show success modal
    await waitFor(() => {
      expect(getByText('Sale Recorded Successfully')).toBeTruthy();
    });
  });

  it('should show error alert on submission failure', async () => {
    // Mock failed Supabase response
    const mockSupabase = require('@supabase/supabase-js');
    mockSupabase.createClient().from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      }),
    });

    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Fill in required fields
    const pumpNumberInput = getByDisplayValue('');
    const volumeInput = getByDisplayValue('');
    const priceInput = getByDisplayValue('');
    
    fireEvent.changeText(pumpNumberInput, '1');
    fireEvent.changeText(volumeInput, '50');
    fireEvent.changeText(priceInput, '500');
    
    const submitButton = getByText('Record Pump Sale');
    fireEvent.press(submitButton);
    
    // Should show error alert
    await waitFor(() => {
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Database error')).toBeTruthy();
    });
  });

  it('should reset form after successful submission', async () => {
    // Mock successful Supabase response
    const mockSupabase = require('@supabase/supabase-js');
    mockSupabase.createClient().from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { getByText, getByDisplayValue } = render(<SalesEntryScreen />);
    
    // Fill in required fields
    const pumpNumberInput = getByDisplayValue('');
    const volumeInput = getByDisplayValue('');
    const priceInput = getByDisplayValue('');
    
    fireEvent.changeText(pumpNumberInput, '1');
    fireEvent.changeText(volumeInput, '50');
    fireEvent.changeText(priceInput, '500');
    
    const submitButton = getByText('Record Pump Sale');
    fireEvent.press(submitButton);
    
    // Wait for success modal and close it
    await waitFor(() => {
      expect(getByText('Sale Recorded Successfully')).toBeTruthy();
    });
    
    const closeButton = getByText('Close');
    fireEvent.press(closeButton);
    
    // Form should be reset
    await waitFor(() => {
      const resetPumpNumberInput = getByDisplayValue('');
      const resetVolumeInput = getByDisplayValue('');
      const resetPriceInput = getByDisplayValue('');
      
      expect(resetPumpNumberInput.props.value).toBe('');
      expect(resetVolumeInput.props.value).toBe('');
      expect(resetPriceInput.props.value).toBe('');
    });
  });
});

