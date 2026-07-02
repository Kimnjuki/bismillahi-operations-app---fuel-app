// Validation utilities for form inputs
import React from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class FormValidator {
  private rules: Record<string, ValidationRule[]> = {};

  addRule(field: string, rule: ValidationRule) {
    if (!this.rules[field]) {
      this.rules[field] = [];
    }
    this.rules[field].push(rule);
    return this;
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = data[field];
      
      for (const rule of rules) {
        const error = this.validateField(value, rule, field);
        if (error) {
          errors[field] = error;
          break; // Stop at first error for this field
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private validateField(value: any, rule: ValidationRule, field: string): string | null {
    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      return rule.message || `${this.formatFieldName(field)} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${this.formatFieldName(field)} must be at least ${rule.minLength} characters`;
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `${this.formatFieldName(field)} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${this.formatFieldName(field)} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  nigerianPhone: /^(\+234|234|0)?[789][01]\d{8}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numbersOnly: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
  currency: /^\d+(\.\d{1,2})?$/,
  url: /^https?:\/\/.+/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Common validation rules
export const CommonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message
  }),
  
  email: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.email,
    message: message || 'Please enter a valid email address'
  }),
  
  password: (message?: string): ValidationRule => ({
    required: true,
    minLength: 6,
    message: message || 'Password must be at least 6 characters'
  }),
  
  strongPassword: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.strongPassword,
    message: message || 'Password must contain at least 8 characters with uppercase, lowercase, number and special character'
  }),
  
  phone: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.nigerianPhone,
    message: message || 'Please enter a valid Nigerian phone number'
  }),
  
  name: (message?: string): ValidationRule => ({
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: ValidationPatterns.alphanumeric,
    message: message || 'Name must be 2-50 characters and contain only letters, numbers and spaces'
  }),
  
  amount: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.currency,
    custom: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return message || 'Amount must be a positive number';
      }
      if (num > 999999999) {
        return message || 'Amount is too large';
      }
      return null;
    }
  }),
  
  quantity: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.decimal,
    custom: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return message || 'Quantity must be a non-negative number';
      }
      return null;
    }
  }),
  
  pumpNumber: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 20) {
        return message || 'Pump number must be between 1 and 20';
      }
      return null;
    }
  }),
  
  fuelType: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
       const validTypes = ['PMS', 'AGO'];
      if (!validTypes.includes(value)) {
        return message || 'Please select a valid fuel type';
      }
      return null;
    }
  }),
  
  drumType: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const validTypes = ['200L', '100L', '50L', '25L'];
      if (!validTypes.includes(value)) {
        return message || 'Please select a valid drum type';
      }
      return null;
    }
  }),
  
  paymentMethod: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const validMethods = ['cash', 'card', 'credit'];
      if (!validMethods.includes(value)) {
        return message || 'Please select a valid payment method';
      }
      return null;
    }
  }),
  
  role: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const validRoles = ['admin', 'manager', 'cashier', 'viewer'];
      if (!validRoles.includes(value)) {
        return message || 'Please select a valid role';
      }
      return null;
    }
  }),
  
  date: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return message || 'Please enter a valid date';
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date > today) {
        return message || 'Date cannot be in the future';
      }
      return null;
    }
  }),
  
  futureDate: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return message || 'Please enter a valid date';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        return message || 'Date cannot be in the past';
      }
      return null;
    }
  }),
  
  description: (message?: string): ValidationRule => ({
    maxLength: 500,
    message: message || 'Description must be no more than 500 characters'
  }),
  
  receiptNumber: (message?: string): ValidationRule => ({
    pattern: /^[A-Z0-9\-]+$/,
    message: message || 'Receipt number can only contain uppercase letters, numbers and hyphens'
  }),
  
  accountNumber: (message?: string): ValidationRule => ({
    required: true,
    pattern: /^\d{10}$/,
    message: message || 'Account number must be exactly 10 digits'
  }),
  
  currency: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const validCurrencies = ['NGN', 'USD', 'EUR', 'GBP'];
      if (!validCurrencies.includes(value)) {
        return message || 'Please select a valid currency';
      }
      return null;
    }
  }),
  
  exchangeRate: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.decimal,
    custom: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return message || 'Exchange rate must be a positive number';
      }
      if (num > 10000) {
        return message || 'Exchange rate seems too high';
      }
      return null;
    }
  }),
};

// Input sanitization functions
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  html: (input: string): string => {
    return input
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Remove iframe tags and content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining angle brackets
      .trim();
  },
  
  // Sanitize for database storage
  database: (input: string): string => {
    return input
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comment markers
      .replace(/\/\*/g, '') // Remove SQL comment start
      .replace(/\*\//g, ''); // Remove SQL comment end
  },
  
  // Sanitize for display
  display: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },
  
  // Sanitize numbers
  number: (input: string): string => {
    return input.replace(/[^\d.-]/g, ''); // Keep only digits, dots, and minus
  },
  
  // Sanitize currency
  currency: (input: string): string => {
    return input.replace(/[^\d.]/g, ''); // Keep only digits and dots
  },
  
  // Sanitize phone number
  phone: (input: string): string => {
    return input.replace(/[^\d+]/g, ''); // Keep only digits and plus
  },
  
  // Sanitize email
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },
  
  // Sanitize general text
  text: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim();
  },
  
  // Sanitize name
  name: (input: string): string => {
    return input
      .replace(/[^a-zA-Z\s]/g, '') // Keep only letters and spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  },
};

// Form validation helpers
export const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule[]>): ValidationResult => {
  const validator = new FormValidator();
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      validator.addRule(field, rule);
    }
  }
  
  return validator.validate(data);
};

// Real-time validation hook
export const useValidation = (rules: Record<string, ValidationRule[]>) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = React.useCallback((data: Record<string, any>) => {
    const result = validateForm(data, rules);
    setErrors(result.errors);
    return result;
  }, [rules]);

  const validateField = React.useCallback((field: string, value: any) => {
    const fieldRules = rules[field] || [];
    if (fieldRules.length === 0) return null;

    const validator = new FormValidator();
    for (const rule of fieldRules) {
      validator.addRule(field, rule);
    }

    const result = validator.validate({ [field]: value });
    return result.errors[field] || null;
  }, [rules]);

  const setFieldTouched = React.useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const hasError = React.useCallback((field: string) => {
    return touched[field] && !!errors[field];
  }, [touched, errors]);

  const getError = React.useCallback((field: string) => {
    return touched[field] ? errors[field] : null;
  }, [touched, errors]);

  return {
    errors,
    touched,
    validate,
    validateField,
    setFieldTouched,
    clearErrors,
    hasError,
    getError,
  };
};


