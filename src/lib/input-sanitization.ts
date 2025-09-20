import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
  normalizeEmail?: boolean;
  strict?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
}

// Default sanitization options
const DEFAULT_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  maxLength: 255,
  trim: true,
  normalizeEmail: true,
  strict: true,
};

// HTML sanitization options
const HTML_SANITIZE_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard' as const,
  allowedSchemes: [],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: [],
  allowProtocolRelative: false,
  enforceHtmlBoundary: false,
};

export class InputSanitizer {
  private options: SanitizationOptions;

  constructor(options: Partial<SanitizationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // Sanitize and validate email
  sanitizeEmail(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = input;

    // Trim whitespace
    if (this.options.trim) {
      sanitizedValue = sanitizedValue.trim();
    }

    // Check if empty
    if (!sanitizedValue) {
      return {
        isValid: false,
        sanitizedValue: '',
        errors: ['Email is required'],
        warnings: [],
      };
    }

    // Check length
    if (this.options.maxLength && sanitizedValue.length > this.options.maxLength) {
      errors.push(`Email must be no more than ${this.options.maxLength} characters`);
    }

    // Normalize email
    if (this.options.normalizeEmail) {
      sanitizedValue = validator.normalizeEmail(sanitizedValue) || sanitizedValue;
    }

    // Validate email format
    if (!validator.isEmail(sanitizedValue)) {
      errors.push('Invalid email format');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedValue)) {
      errors.push('Email contains suspicious patterns');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings,
    };
  }

  // Sanitize and validate text input
  sanitizeText(input: string, fieldName: string = 'text'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = input;

    // Trim whitespace
    if (this.options.trim) {
      sanitizedValue = sanitizedValue.trim();
    }

    // Check if empty
    if (!sanitizedValue) {
      return {
        isValid: false,
        sanitizedValue: '',
        errors: [`${fieldName} is required`],
        warnings: [],
      };
    }

    // Check length
    if (this.options.maxLength && sanitizedValue.length > this.options.maxLength) {
      errors.push(`${fieldName} must be no more than ${this.options.maxLength} characters`);
    }

    // Sanitize HTML if not allowed
    if (!this.options.allowHtml) {
      const originalLength = sanitizedValue.length;
      sanitizedValue = sanitizeHtml(sanitizedValue, HTML_SANITIZE_OPTIONS);
      
      if (sanitizedValue.length !== originalLength) {
        warnings.push('HTML tags were removed from input');
      }
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedValue)) {
      errors.push(`${fieldName} contains suspicious patterns`);
    }

    // Check for SQL injection patterns
    if (this.containsSQLInjectionPatterns(sanitizedValue)) {
      errors.push(`${fieldName} contains potentially malicious content`);
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings,
    };
  }

  // Sanitize and validate role input
  sanitizeRole(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = input;

    // Trim and normalize
    sanitizedValue = sanitizedValue.trim().toLowerCase();

    // Validate against allowed roles
    const allowedRoles = ['admin', 'viewer', 'editor'];
    if (!allowedRoles.includes(sanitizedValue)) {
      errors.push(`Role must be one of: ${allowedRoles.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings,
    };
  }

  // Sanitize and validate display name
  sanitizeDisplayName(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = input;

    // Trim whitespace
    sanitizedValue = sanitizedValue.trim();

    // Check if empty
    if (!sanitizedValue) {
      return {
        isValid: true, // Display name is optional
        sanitizedValue: '',
        errors: [],
        warnings: [],
      };
    }

    // Check length
    if (sanitizedValue.length > 100) {
      errors.push('Display name must be no more than 100 characters');
    }

    // Remove HTML tags
    const originalLength = sanitizedValue.length;
    sanitizedValue = sanitizeHtml(sanitizedValue, HTML_SANITIZE_OPTIONS);
    
    if (sanitizedValue.length !== originalLength) {
      warnings.push('HTML tags were removed from display name');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedValue)) {
      errors.push('Display name contains suspicious patterns');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings,
    };
  }

  // Sanitize JSON input
  sanitizeJson(input: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Convert to string and back to ensure it's valid JSON
      const jsonString = JSON.stringify(input);
      const sanitizedValue = JSON.parse(jsonString);

      // Check for suspicious keys
      if (this.containsSuspiciousKeys(sanitizedValue)) {
        errors.push('JSON contains suspicious keys');
      }

      return {
        isValid: errors.length === 0,
        sanitizedValue,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        sanitizedValue: '{}',
        errors: ['Invalid JSON format'],
        warnings: [],
      };
    }
  }

  // Check for suspicious patterns
  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /@import/i,
      /@charset/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  // Check for SQL injection patterns
  private containsSQLInjectionPatterns(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(UNION\s+SELECT)/i,
      /(DROP\s+TABLE)/i,
      /(DELETE\s+FROM)/i,
      /(INSERT\s+INTO)/i,
      /(UPDATE\s+SET)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for suspicious keys in JSON
  private containsSuspiciousKeys(obj: any): boolean {
    const suspiciousKeys = ['__proto__', 'constructor', 'prototype'];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (suspiciousKeys.includes(key.toLowerCase())) {
          return true;
        }
        if (typeof obj[key] === 'object') {
          if (this.containsSuspiciousKeys(obj[key])) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

// Convenience functions
export function sanitizeEmail(input: string, options?: Partial<SanitizationOptions>): ValidationResult {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeEmail(input);
}

export function sanitizeText(input: string, fieldName?: string, options?: Partial<SanitizationOptions>): ValidationResult {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeText(input, fieldName);
}

export function sanitizeRole(input: string, options?: Partial<SanitizationOptions>): ValidationResult {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeRole(input);
}

export function sanitizeDisplayName(input: string, options?: Partial<SanitizationOptions>): ValidationResult {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeDisplayName(input);
}

export function sanitizeJson(input: any, options?: Partial<SanitizationOptions>): ValidationResult {
  const sanitizer = new InputSanitizer(options);
  return sanitizer.sanitizeJson(input);
}
