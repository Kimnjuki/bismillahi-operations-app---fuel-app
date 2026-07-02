import { FormValidator, ValidationPatterns, CommonRules, sanitizeInput } from '../../src/utils/validation';

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

describe('FormValidator', () => {
  let validator: FormValidator;

  beforeEach(() => {
    validator = new FormValidator();
  });

  describe('addRule', () => {
    it('should add a validation rule for a field', () => {
      validator.addRule('email', { required: true, pattern: ValidationPatterns.email });
      
      expect(validator['rules']['email']).toHaveLength(1);
      expect(validator['rules']['email'][0]).toEqual({
        required: true,
        pattern: ValidationPatterns.email,
      });
    });

    it('should add multiple rules for the same field', () => {
      validator
        .addRule('password', { required: true })
        .addRule('password', { minLength: 6 });

      expect(validator['rules']['password']).toHaveLength(2);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid data', () => {
      validator.addRule('email', { required: true, pattern: ValidationPatterns.email });
      
      const result = validator.validate({ email: 'test@example.com' });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return invalid result for missing required field', () => {
      validator.addRule('email', { required: true });
      
      const result = validator.validate({ email: '' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    it('should return invalid result for pattern mismatch', () => {
      validator.addRule('email', { required: true, pattern: ValidationPatterns.email });
      
      const result = validator.validate({ email: 'invalid-email' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email format is invalid');
    });

    it('should return invalid result for minLength violation', () => {
      validator.addRule('password', { required: true, minLength: 6 });
      
      const result = validator.validate({ password: '123' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password must be at least 6 characters');
    });

    it('should return invalid result for maxLength violation', () => {
      validator.addRule('name', { required: true, maxLength: 5 });
      
      const result = validator.validate({ name: 'Very Long Name' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name must be no more than 5 characters');
    });

    it('should return invalid result for custom validation', () => {
      validator.addRule('age', {
        required: true,
        custom: (value) => {
          const age = parseInt(value);
          if (age < 18) return 'Age must be at least 18';
          return null;
        },
      });
      
      const result = validator.validate({ age: '16' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Age must be at least 18');
    });

    it('should stop at first error for each field', () => {
      validator
        .addRule('email', { required: true })
        .addRule('email', { pattern: ValidationPatterns.email });
      
      const result = validator.validate({ email: '' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
      expect(Object.keys(result.errors)).toHaveLength(1);
    });
  });
});

describe('ValidationPatterns', () => {
  describe('email', () => {
    it('should match valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        expect(ValidationPatterns.email.test(email)).toBe(true);
      });
    });

    it('should not match invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
      ];

      invalidEmails.forEach(email => {
        expect(ValidationPatterns.email.test(email)).toBe(false);
      });
    });
  });

  describe('nigerianPhone', () => {
    it('should match valid Nigerian phone numbers', () => {
      const validPhones = [
        '08012345678',
        '08123456789',
        '09012345678',
        '09123456789',
        '+2348012345678',
        '2348012345678',
      ];

      validPhones.forEach(phone => {
        expect(ValidationPatterns.nigerianPhone.test(phone)).toBe(true);
      });
    });

    it('should not match invalid phone numbers', () => {
      const invalidPhones = [
        '1234567890',
        '08012345678a',
        '0801234567890',
        '07012345678',
        '06012345678',
      ];

      invalidPhones.forEach(phone => {
        expect(ValidationPatterns.nigerianPhone.test(phone)).toBe(false);
      });
    });
  });

  describe('currency', () => {
    it('should match valid currency values', () => {
      const validValues = ['100', '100.50', '1000.00', '0.01'];

      validValues.forEach(value => {
        expect(ValidationPatterns.currency.test(value)).toBe(true);
      });
    });

    it('should not match invalid currency values', () => {
      const invalidValues = ['abc', '100.123', '100,50', '-100'];

      invalidValues.forEach(value => {
        expect(ValidationPatterns.currency.test(value)).toBe(false);
      });
    });
  });
});

describe('CommonRules', () => {
  describe('email', () => {
    it('should create email validation rule', () => {
      const rule = CommonRules.email();
      
      expect(rule.required).toBe(true);
      expect(rule.pattern).toBe(ValidationPatterns.email);
      expect(rule.message).toBe('Please enter a valid email address');
    });

    it('should create email validation rule with custom message', () => {
      const customMessage = 'Custom email message';
      const rule = CommonRules.email(customMessage);
      
      expect(rule.message).toBe(customMessage);
    });
  });

  describe('amount', () => {
    it('should validate positive amounts', () => {
      const rule = CommonRules.amount();
      
      expect(rule.required).toBe(true);
      expect(rule.pattern).toBe(ValidationPatterns.currency);
      expect(rule.custom).toBeDefined();
    });

    it('should reject negative amounts', () => {
      const rule = CommonRules.amount();
      const result = rule.custom?.('-100');
      
      expect(result).toBe('Amount must be a positive number');
    });

    it('should reject zero amounts', () => {
      const rule = CommonRules.amount();
      const result = rule.custom?.('0');
      
      expect(result).toBe('Amount must be a positive number');
    });

    it('should accept valid amounts', () => {
      const rule = CommonRules.amount();
      const result = rule.custom?.('100.50');
      
      expect(result).toBeNull();
    });
  });

  describe('pumpNumber', () => {
    it('should validate pump numbers between 1 and 20', () => {
      const rule = CommonRules.pumpNumber();
      
      expect(rule.required).toBe(true);
      expect(rule.custom).toBeDefined();
    });

    it('should reject invalid pump numbers', () => {
      const rule = CommonRules.pumpNumber();
      
      expect(rule.custom?.('0')).toBe('Pump number must be between 1 and 20');
      expect(rule.custom?.('21')).toBe('Pump number must be between 1 and 20');
      expect(rule.custom?.('abc')).toBe('Pump number must be between 1 and 20');
    });

    it('should accept valid pump numbers', () => {
      const rule = CommonRules.pumpNumber();
      
      expect(rule.custom?.('1')).toBeNull();
      expect(rule.custom?.('10')).toBeNull();
      expect(rule.custom?.('20')).toBeNull();
    });
  });
});

describe('sanitizeInput', () => {
  describe('html', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput.html(input);
      
      expect(result).toBe('Hello World');
    });

    it('should remove angle brackets', () => {
      const input = 'Hello < World >';
      const result = sanitizeInput.html(input);
      
      expect(result).toBe('Hello World');
    });
  });

  describe('database', () => {
    it('should remove SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizeInput.database(input);
      
      expect(result).toBe('DROP TABLE users');
    });

    it('should remove quotes and semicolons', () => {
      const input = 'Hello "world"; test';
      const result = sanitizeInput.database(input);
      
      expect(result).toBe('Hello world test');
    });
  });

  describe('email', () => {
    it('should convert to lowercase and trim', () => {
      const input = '  TEST@EXAMPLE.COM  ';
      const result = sanitizeInput.email(input);
      
      expect(result).toBe('test@example.com');
    });
  });

  describe('currency', () => {
    it('should keep only digits and dots', () => {
      const input = '₦1,000.50';
      const result = sanitizeInput.currency(input);
      
      expect(result).toBe('1000.50');
    });
  });

  describe('phone', () => {
    it('should keep only digits and plus', () => {
      const input = '+234 (0) 801-234-5678';
      const result = sanitizeInput.phone(input);
      
      expect(result).toBe('+23408012345678');
    });
  });

  describe('name', () => {
    it('should keep only letters and spaces', () => {
      const input = 'John123 Doe!@#';
      const result = sanitizeInput.name(input);
      
      expect(result).toBe('John Doe');
    });

    it('should replace multiple spaces with single space', () => {
      const input = 'John    Doe';
      const result = sanitizeInput.name(input);
      
      expect(result).toBe('John Doe');
    });
  });
});

