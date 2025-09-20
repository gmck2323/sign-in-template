import { NextRequest, NextResponse } from 'next/server';
import { InputSanitizer, ValidationResult } from '../input-sanitization';

export interface SanitizationConfig {
  fields: {
    [key: string]: {
      type: 'email' | 'text' | 'role' | 'displayName' | 'json';
      required?: boolean;
      maxLength?: number;
      allowHtml?: boolean;
    };
  };
  strict?: boolean;
}

export function withInputSanitization(config: SanitizationConfig) {
  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      try {
        // Only sanitize POST, PUT, PATCH requests
        if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
          return await handler(request);
        }

        // Parse request body
        let body: any;
        try {
          body = await request.json();
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          );
        }

        // Sanitize fields
        const sanitizer = new InputSanitizer({
          strict: config.strict ?? true,
        });

        const sanitizedBody: any = {};
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
          const value = body[fieldName];
          
          // Check if required field is missing
          if (fieldConfig.required && (value === undefined || value === null || value === '')) {
            allErrors.push(`${fieldName} is required`);
            continue;
          }

          // Skip optional fields that are empty
          if (!fieldConfig.required && (value === undefined || value === null || value === '')) {
            sanitizedBody[fieldName] = value;
            continue;
          }

          // Sanitize based on field type
          let result: ValidationResult;
          
          switch (fieldConfig.type) {
            case 'email':
              result = sanitizer.sanitizeEmail(value);
              break;
            case 'text':
              result = sanitizer.sanitizeText(value, fieldName);
              break;
            case 'role':
              result = sanitizer.sanitizeRole(value);
              break;
            case 'displayName':
              result = sanitizer.sanitizeDisplayName(value);
              break;
            case 'json':
              result = sanitizer.sanitizeJson(value);
              break;
            default:
              result = {
                isValid: false,
                sanitizedValue: value,
                errors: [`Unknown field type: ${fieldConfig.type}`],
                warnings: [],
              };
          }

          // Collect errors and warnings
          allErrors.push(...result.errors);
          allWarnings.push(...result.warnings);

          // Set sanitized value
          sanitizedBody[fieldName] = result.sanitizedValue;
        }

        // Return errors if any
        if (allErrors.length > 0) {
          return NextResponse.json(
            { 
              error: 'Input validation failed',
              details: allErrors,
            },
            { status: 400 }
          );
        }

        // Log warnings if any
        if (allWarnings.length > 0) {
          console.warn('Input sanitization warnings:', allWarnings);
        }

        // Create new request with sanitized body
        const sanitizedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody),
        });

        return await handler(sanitizedRequest);

      } catch (error) {
        console.error('Input sanitization middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// Predefined sanitization configs for common endpoints
export const sanitizationConfigs = {
  // User creation/update
  user: {
    fields: {
      email: { type: 'email' as const, required: true, maxLength: 255 },
      display_name: { type: 'displayName' as const, required: false, maxLength: 100 },
      role: { type: 'role' as const, required: true },
    },
    strict: true,
  },
  
  // Admin operations
  admin: {
    fields: {
      email: { type: 'email' as const, required: true, maxLength: 255 },
      display_name: { type: 'displayName' as const, required: false, maxLength: 100 },
      role: { type: 'role' as const, required: true },
    },
    strict: true,
  },
  
  // General API input
  api: {
    fields: {
      // Add fields as needed
    },
    strict: true,
  },
};
