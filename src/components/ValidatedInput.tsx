import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ValidatedInputProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  showPasswordToggle?: boolean;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  helperText?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  error,
  touched,
  onBlur,
  onFocus,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  showPasswordToggle = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  helperText,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
  }, []);

  const hasError = touched && !!error;
  const showError = hasError && error;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <Text style={[styles.label, labelStyle]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Input Container */}
      <View
        testID="input-container"
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <MaterialIcons
            testID="left-icon"
            name={leftIcon}
            size={20}
            color={hasError ? '#FF6B6B' : isFocused ? '#667eea' : '#999'}
            style={styles.leftIcon}
          />
        )}

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          placeholderTextColor="#999"
          {...textInputProps}
        />

        {/* Right Icon */}
        {showPasswordToggle ? (
          <TouchableOpacity
            testID="password-toggle"
            onPress={togglePasswordVisibility}
            style={styles.rightIconContainer}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility-off' : 'visibility'}
              size={20}
              color={hasError ? '#FF6B6B' : '#999'}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            testID="right-icon"
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={rightIcon}
              size={20}
              color={hasError ? '#FF6B6B' : '#999'}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Helper Text or Error */}
      {showError ? (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFF',
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#667eea',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginLeft: 12,
  },
  rightIconContainer: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

