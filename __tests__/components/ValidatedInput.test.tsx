import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '../utils/testUtils';
import { ValidatedInput } from '../../src/components/ValidatedInput';

describe('ValidatedInput', () => {
  const defaultProps = {
    label: 'Test Input',
    value: '',
    onChangeText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    const { getByText } = render(<ValidatedInput {...defaultProps} />);
    
    expect(getByText('Test Input')).toBeTruthy();
  });

  it('should render with required indicator', () => {
    const { getByText } = render(
      <ValidatedInput {...defaultProps} required />
    );
    
    expect(getByText('*')).toBeTruthy();
  });

  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(
      <ValidatedInput {...defaultProps} placeholder="Enter text" />
    );
    
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('should display error message when error is provided', () => {
    const { getByText } = render(
      <ValidatedInput
        {...defaultProps}
        error="This field is required"
        touched
      />
    );
    
    expect(getByText('This field is required')).toBeTruthy();
  });

  it('should not display error when not touched', () => {
    const { queryByText } = render(
      <ValidatedInput
        {...defaultProps}
        error="This field is required"
        touched={false}
      />
    );
    
    expect(queryByText('This field is required')).toBeNull();
  });

  it('should display helper text when provided', () => {
    const { getByText } = render(
      <ValidatedInput
        {...defaultProps}
        helperText="This is helpful information"
      />
    );
    
    expect(getByText('This is helpful information')).toBeTruthy();
  });

  it('should call onChangeText when text changes', () => {
    const mockOnChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
        onChangeText={mockOnChangeText}
      />
    );
    
    const input = getByDisplayValue('test');
    fireEvent.changeText(input, 'new text');
    
    expect(mockOnChangeText).toHaveBeenCalledWith('new text');
  });

  it('should call onBlur when input loses focus', () => {
    const mockOnBlur = jest.fn();
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
        onBlur={mockOnBlur}
      />
    );
    
    const input = getByDisplayValue('test');
    fireEvent(input, 'blur');
    
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('should call onFocus when input gains focus', () => {
    const mockOnFocus = jest.fn();
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
        onFocus={mockOnFocus}
      />
    );
    
    const input = getByDisplayValue('test');
    fireEvent(input, 'focus');
    
    expect(mockOnFocus).toHaveBeenCalled();
  });

  it('should render with left icon', () => {
    const { getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        leftIcon="email"
      />
    );
    
    // The icon should be present (exact test depends on icon implementation)
    expect(getByTestId('left-icon')).toBeTruthy();
  });

  it('should render with right icon', () => {
    const { getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        rightIcon="visibility"
      />
    );
    
    expect(getByTestId('right-icon')).toBeTruthy();
  });

  it('should handle password toggle', () => {
    const { getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        showPasswordToggle
        secureTextEntry
      />
    );
    
    const toggleButton = getByTestId('password-toggle');
    expect(toggleButton).toBeTruthy();
    
    // Test toggle functionality
    fireEvent.press(toggleButton);
    
    // The secureTextEntry should change (exact test depends on implementation)
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
        disabled
      />
    );
    
    const input = getByDisplayValue('test');
    expect(input.props.editable).toBe(false);
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        containerStyle={customStyle}
      />
    );
    
    const container = getByTestId('input-container');
    expect(container.props.style).toContainEqual(customStyle);
  });

  it('should handle multiline input', () => {
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
        multiline
      />
    );
    
    const input = getByDisplayValue('test');
    expect(input.props.multiline).toBe(true);
  });

  it('should handle keyboard type', () => {
    const { getByDisplayValue } = render(
      <ValidatedInput
        {...defaultProps}
        value="123"
        keyboardType="numeric"
      />
    );
    
    const input = getByDisplayValue('123');
    expect(input.props.keyboardType).toBe('numeric');
  });

  it('should show error state styling when error is present', () => {
    const { getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        error="Error message"
        touched
      />
    );
    
    const container = getByTestId('input-container');
    expect(container.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: '#FF6B6B',
      })
    );
  });

  it('should show focused state styling when focused', async () => {
    const { getByDisplayValue, getByTestId } = render(
      <ValidatedInput
        {...defaultProps}
        value="test"
      />
    );
    
    const input = getByDisplayValue('test');
    fireEvent(input, 'focus');
    
    await waitFor(() => {
      const container = getByTestId('input-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({
          borderColor: '#667eea',
        })
      );
    });
  });
});

