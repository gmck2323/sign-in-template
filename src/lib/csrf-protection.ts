import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, validateCSRFToken } from './session-security';

export interface CSRFConfig {
  tokenLength?: number;
  tokenHeader?: string;
  cookieName?: string;
  cookieMaxAge?: number;
  requireHTTPS?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

const DEFAULT_CONFIG: CSRFConfig = {
  tokenLength: 32,
  tokenHeader: 'x-csrf-token',
  cookieName: 'csrf-token',
  cookieMaxAge: 3600, // 1 hour
  requireHTTPS: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

export class CSRFProtection {
  private config: CSRFConfig;

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Generate CSRF token
  generateToken(): string {
    return generateCSRFToken();
  }

  // Set CSRF token in response cookie
  setTokenCookie(response: NextResponse, token: string): void {
    const cookieOptions = [
      `${this.config.cookieName}=${token}`,
      `Max-Age=${this.config.cookieMaxAge}`,
      `Path=/`,
      `SameSite=${this.config.sameSite}`,
    ];

    if (this.config.requireHTTPS) {
      cookieOptions.push('Secure');
    }

    cookieOptions.push('HttpOnly');

    response.headers.set('Set-Cookie', cookieOptions.join('; '));
  }

  // Validate CSRF token from request
  validateToken(request: NextRequest): {
    isValid: boolean;
    error?: string;
  } {
    try {
      // Get token from header
      const tokenFromHeader = request.headers.get(this.config.tokenHeader!);
      
      // Get token from cookie
      const tokenFromCookie = this.getTokenFromCookie(request);

      if (!tokenFromHeader) {
        return {
          isValid: false,
          error: 'CSRF token missing from request header',
        };
      }

      if (!tokenFromCookie) {
        return {
          isValid: false,
          error: 'CSRF token missing from cookie',
        };
      }

      // Validate token
      if (!validateCSRFToken(tokenFromHeader, tokenFromCookie)) {
        return {
          isValid: false,
          error: 'CSRF token validation failed',
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: 'CSRF token validation error',
      };
    }
  }

  // Get CSRF token from cookie
  private getTokenFromCookie(request: NextRequest): string | null {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const csrfCookie = cookies.find(cookie => 
      cookie.startsWith(`${this.config.cookieName}=`)
    );

    if (!csrfCookie) return null;

    return csrfCookie.split('=')[1];
  }

  // Check if request needs CSRF protection
  needsProtection(request: NextRequest): boolean {
    const method = request.method;
    const pathname = new URL(request.url).pathname;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return false;
    }

    // Skip CSRF protection for certain paths
    const skipPaths = [
      '/api/health',
      '/api/auth/callback',
    ];

    if (skipPaths.some(path => pathname.startsWith(path))) {
      return false;
    }

    return true;
  }
}

// CSRF middleware
export function withCSRFProtection(config: Partial<CSRFConfig> = {}) {
  const csrf = new CSRFProtection(config);

  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      try {
        // Check if request needs CSRF protection
        if (!csrf.needsProtection(request)) {
          return await handler(request);
        }

        // Validate CSRF token
        const validation = csrf.validateToken(request);
        
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              error: 'CSRF token validation failed',
              details: validation.error,
            },
            { status: 403 }
          );
        }

        return await handler(request);

      } catch (error) {
        console.error('CSRF protection middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// CSRF token generation endpoint
export async function generateCSRFTokenEndpoint(request: NextRequest): Promise<NextResponse> {
  try {
    const csrf = new CSRFProtection();
    const token = csrf.generateToken();
    
    const response = NextResponse.json({ 
      csrfToken: token,
      tokenHeader: csrf['config'].tokenHeader,
    });
    
    csrf.setTokenCookie(response, token);
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

// Predefined CSRF configs
export const csrfConfigs = {
  // Strict CSRF protection
  strict: {
    tokenLength: 32,
    tokenHeader: 'x-csrf-token',
    cookieName: 'csrf-token',
    cookieMaxAge: 3600,
    requireHTTPS: true,
    sameSite: 'strict' as const,
  },
  
  // Lax CSRF protection (for development)
  lax: {
    tokenLength: 32,
    tokenHeader: 'x-csrf-token',
    cookieName: 'csrf-token',
    cookieMaxAge: 3600,
    requireHTTPS: false,
    sameSite: 'lax' as const,
  },
};
