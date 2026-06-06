import { securityService } from './securityService';

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

// Validation rules interface
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  sanitize?: boolean;
  sanitizeType?: 'text' | 'html' | 'sql' | 'url';
  message?: string;
}

// Field validation configuration
export interface FieldValidation {
  [fieldName: string]: ValidationRule[];
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
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
  nigerianAccountNumber: /^\d{10}$/,
  bvn: /^\d{11}$/,
};

class InputValidationService {
  // Validate single field
  validateField(fieldName: string, value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    for (const rule of rules) {
      const error = this.validateRule(value, rule, fieldName);
      if (error) {
        errors.push(error);
        break; // Stop at first error
      }
    }

    // Sanitize value if validation passes and sanitization is enabled
    if (errors.length === 0 && rules.some(rule => rule.sanitize)) {
      const sanitizeRule = rules.find(rule => rule.sanitize);
      if (sanitizeRule && typeof value === 'string') {
        sanitizedValue = securityService.sanitizeInput(value, sanitizeRule.sanitizeType || 'text');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? sanitizedValue : value,
    };
  }

  // Validate multiple fields
  validateFields(data: Record<string, any>, fieldValidations: FieldValidation): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [fieldName, rules] of Object.entries(fieldValidations)) {
      const value = data[fieldName];
      results[fieldName] = this.validateField(fieldName, value, rules);
    }

    return results;
  }

  // Validate single rule
  private validateRule(value: any, rule: ValidationRule, fieldName: string): string | null {
    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      return rule.message || `${this.formatFieldName(fieldName)} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return null;
    }

    // Type-specific validations
    if (typeof value === 'string') {
      return this.validateString(value, rule, fieldName);
    } else if (typeof value === 'number') {
      return this.validateNumber(value, rule, fieldName);
    } else if (value instanceof Date) {
      return this.validateDate(value, rule, fieldName);
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  // Validate string values
  private validateString(value: string, rule: ValidationRule, fieldName: string): string | null {
    // Length validations
    if (rule.minLength && value.length < rule.minLength) {
      return rule.message || `${this.formatFieldName(fieldName)} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return rule.message || `${this.formatFieldName(fieldName)} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message || `${this.formatFieldName(fieldName)} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  // Validate number values
  private validateNumber(value: number, rule: ValidationRule, fieldName: string): string | null {
    // Range validations
    if (rule.min !== undefined && value < rule.min) {
      return rule.message || `${this.formatFieldName(fieldName)} must be at least ${rule.min}`;
    }

    if (rule.max !== undefined && value > rule.max) {
      return rule.message || `${this.formatFieldName(fieldName)} must be no more than ${rule.max}`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  // Validate date values
  private validateDate(value: Date, rule: ValidationRule, fieldName: string): string | null {
    // Check if date is valid
    if (isNaN(value.getTime())) {
      return rule.message || `${this.formatFieldName(fieldName)} is not a valid date`;
    }

    // Check if date is in the past (for certain fields)
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  // Format field name for error messages
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Common validation rules
  getCommonRules() {
    return {
      required: (message?: string): ValidationRule => ({
        required: true,
        message,
      }),

      email: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.email,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Please enter a valid email address',
      }),

      password: (message?: string): ValidationRule => ({
        required: true,
        minLength: 8,
        pattern: ValidationPatterns.strongPassword,
        message: message || 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
      }),

      phone: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.nigerianPhone,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Please enter a valid Nigerian phone number',
      }),

      name: (message?: string): ValidationRule => ({
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: ValidationPatterns.alphanumeric,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Name must be 2-50 characters and contain only letters, numbers and spaces',
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
        },
        sanitize: true,
        sanitizeType: 'text',
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
        },
        sanitize: true,
        sanitizeType: 'text',
      }),

      pumpNumber: (message?: string): ValidationRule => ({
        required: true,
        custom: (value) => {
          const num = parseInt(value);
          if (isNaN(num) || num < 1 || num > 20) {
            return message || 'Pump number must be between 1 and 20';
          }
          return null;
        },
        sanitize: true,
        sanitizeType: 'text',
      }),

      date: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.date,
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
        },
        sanitize: true,
        sanitizeType: 'text',
      }),

      url: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.url,
        sanitize: true,
        sanitizeType: 'url',
        message: message || 'Please enter a valid URL',
      }),

      accountNumber: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.nigerianAccountNumber,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Account number must be exactly 10 digits',
      }),

      bvn: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.bvn,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'BVN must be exactly 11 digits',
      }),

      creditCard: (message?: string): ValidationRule => ({
        required: true,
        pattern: ValidationPatterns.creditCard,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Please enter a valid credit card number',
      }),

      description: (message?: string): ValidationRule => ({
        maxLength: 500,
        sanitize: true,
        sanitizeType: 'html',
        message: message || 'Description must be no more than 500 characters',
      }),

      receiptNumber: (message?: string): ValidationRule => ({
        pattern: /^[A-Z0-9\-]+$/,
        sanitize: true,
        sanitizeType: 'text',
        message: message || 'Receipt number can only contain uppercase letters, numbers and hyphens',
      }),
    };
  }

  // Validate form data with common rules
  validateFormData(data: Record<string, any>, formType: 'login' | 'signup' | 'pumpSale' | 'drumSale' | 'expense' | 'user'): Record<string, ValidationResult> {
    const commonRules = this.getCommonRules();
    let fieldValidations: FieldValidation = {};

    switch (formType) {
      case 'login':
        fieldValidations = {
          email: [commonRules.email()],
          password: [commonRules.required('Password is required')],
        };
        break;

      case 'signup':
        fieldValidations = {
          email: [commonRules.email()],
          password: [commonRules.password()],
          fullName: [commonRules.name()],
        };
        break;

      case 'pumpSale':
        fieldValidations = {
          pumpNumber: [commonRules.pumpNumber()],
          volumeLiters: [commonRules.quantity('Volume must be a positive number')],
          pricePerLiter: [commonRules.amount('Price per liter must be a positive number')],
        };
        break;

      case 'drumSale':
        fieldValidations = {
          quantity: [commonRules.quantity('Quantity must be a positive number')],
          pricePerDrum: [commonRules.amount('Price per drum must be a positive number')],
        };
        break;

      case 'expense':
        fieldValidations = {
          amount: [commonRules.amount()],
          description: [commonRules.description()],
          receiptNumber: [commonRules.receiptNumber()],
        };
        break;

      case 'user':
        fieldValidations = {
          email: [commonRules.email()],
          fullName: [commonRules.name()],
          phone: [commonRules.phone()],
        };
        break;
    }

    return this.validateFields(data, fieldValidations);
  }

  // Check for SQL injection attempts
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(;\s*(DROP|DELETE|INSERT|UPDATE))/i,
      /(--|\/\*|\*\/)/,
      /(\b(UNION|SELECT)\b.*\b(FROM|WHERE)\b)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for XSS attempts
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Check for path traversal attempts
  detectPathTraversal(input: string): boolean {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /\.\.%252f/gi,
      /\.\.%255c/gi,
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(input));
  }

  // Comprehensive security validation
  validateSecurity(input: string): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    if (this.detectSQLInjection(input)) {
      threats.push('SQL Injection attempt detected');
    }

    if (this.detectXSS(input)) {
      threats.push('XSS attempt detected');
    }

    if (this.detectPathTraversal(input)) {
      threats.push('Path traversal attempt detected');
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }
}

// Export singleton instance
export const inputValidationService = new InputValidationService();

// Export types
// Types already exported above

