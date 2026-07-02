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
    // Default station is ISSIRO STATION (first in STATIONS array) which is a pump station
    expect(getByText('Create Sales Receipt')).toBeTruthy();
    expect(getByText('Station')).toBeTruthy();
    expect(getByText('Customer')).toBeTruthy();
    expect(getByText('Payment')).toBeTruthy();
    expect(getByText('Ref No')).toBeTruthy();
    expect(getByText('ITEM')).toBeTruthy();
    expect(getByText('QTY (LITERS)')).toBeTruthy();
    expect(getByText('RATE (CDF)')).toBeTruthy();
    expect(getByText('Add Item')).toBeTruthy();
  });

  it('should switch to drum sales form when station is changed to a drum station', () => {
    const { getByText } = render(<SalesEntryScreen />);
    // Find the station selector and change it to a drum station (e.g., DEPOT ISSIRO)
    const stationDropdown = getByText('ISSIRO STATION'); // Assuming first station is ISSIRO STATION
    fireEvent.press(stationDropdown);
    // The station selector is a TouchableOpacity that cycles through stations.
    // We need to press it until we get to a drum station.
    // Since we don't know the exact order, we will press it a few times and check for drum station text.
    // We know DRUM_STATIONS are ['DEPOT ISSIRO', 'DUNGU STATION'].
    // We'll press until we see one of them.
    let foundDrumStation = false;
    for (let i = 0; i < 10; i++) {
      fireEvent.press(stationDropdown);
      if (getByText('DEPOT ISSIRO', { exact: false }) || getByText('DUNGU STATION', { exact: false })) {
        foundDrumStation = true;
        break;
      }
    }
    expect(foundDrumStation).toBe(true);
    // Now check that the form shows drum sales inputs
    expect(getByText('ITEM')).toBeTruthy();
    expect(getByText('NUMBER OF DRUMS')).toBeTruthy();
    expect(getByText('RATE (CDF)')).toBeTruthy();
    // The pump-specific inputs should not be present
    expect(() => getByText('QTY (LITERS)')).toThrow(); // This will throw if not found
  });

  it('should switch back to pump sales form when station is changed to a pump station', () => {
    const { getByText } = render(<SalesEntryScreen />);
    // First, change to a drum station (as above)
    const stationDropdown = getByText('ISSIRO STATION');
    let foundDrumStation = false;
    for (let i = 0; i < 10; i++) {
      fireEvent.press(stationDropdown);
      if (getByText('DEPOT ISSIRO', { exact: false }) || getByText('DUNGU STATION', { exact: false })) {
        foundDrumStation = true;
        break;
      }
    }
    expect(foundDrumStation).toBe(true);
    // Now change back to a pump station by continuing to cycle
    let foundPumpStation = false;
    for (let i = 0; i < 10; i++) {
      fireEvent.press(stationDropdown);
      // Check if we are back to a pump station (e.g., ISSIRO STATION)
      if (getByText('ISSIRO STATION', { exact: false })) {
        foundPumpStation = true;
        break;
      }
    }
    expect(foundPumpStation).toBe(true);
    // Now check that the form shows pump sales inputs
    expect(getByText('ITEM')).toBeTruthy();
    expect(getByText('QTY (LITERS)')).toBeTruthy();
    expect(getByText('RATE (CDF)')).toBeTruthy();
    // The drum-specific inputs should not be present
    expect(() => getByText('NUMBER OF DRUMS')).toThrow();
  });

  it('should show validation errors for empty required fields', async () => {
    const { getByText } = render(<SalesEntryScreen />);
    const submitButton = getByText('Submit Receipt');
    fireEvent.press(submitButton);
    // Wait for validation error
    await waitFor(() => {
      expect(getByText('Quantity cannot be negative')).toBeTruthy();
    });
  });
});