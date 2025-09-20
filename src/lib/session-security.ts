import { NextRequest, NextResponse } from 'next/server';

export interface SessionSecurityConfig {
  maxAge: number; // Session max age in seconds
  secure: boolean; // HTTPS only
  httpOnly: boolean; // Prevent XSS
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

export const DEFAULT_SESSION_CONFIG: SessionSecurityConfig = {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

export function createSecureCookie(
  name: string,
  value: string,
  config: Partial<SessionSecurityConfig> = {}
): string {
  const cookieConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
  
  const cookieParts = [
    `${name}=${value}`,
    `Max-Age=${cookieConfig.maxAge}`,
    `Path=${cookieConfig.path}`,
    `SameSite=${cookieConfig.sameSite}`,
  ];
  
  if (cookieConfig.secure) {
    cookieParts.push('Secure');
  }
  
  if (cookieConfig.httpOnly) {
    cookieParts.push('HttpOnly');
  }
  
  if (cookieConfig.domain) {
    cookieParts.push(`Domain=${cookieConfig.domain}`);
  }
  
  return cookieParts.join('; ');
}

export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  config: Partial<SessionSecurityConfig> = {}
): void {
  const cookie = createSecureCookie(name, value, config);
  response.headers.set('Set-Cookie', cookie);
}

export function clearSecureCookie(
  response: NextResponse,
  name: string,
  config: Partial<SessionSecurityConfig> = {}
): void {
  const cookie = createSecureCookie(name, '', {
    ...config,
    maxAge: 0,
  });
  response.headers.set('Set-Cookie', cookie);
}

// Session validation utilities
export function validateSessionRequest(request: NextRequest): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if request is over HTTPS in production
  if (process.env.NODE_ENV === 'production' && !request.url.startsWith('https://')) {
    issues.push('Request must be over HTTPS in production');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-original-url',
  ];
  
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && !isValidHeaderValue(value)) {
      issues.push(`Suspicious header value: ${header}`);
    }
  }
  
  // Check for suspicious query parameters
  const url = new URL(request.url);
  const suspiciousParams = ['javascript:', 'data:', 'vbscript:'];
  
  url.searchParams.forEach((value, key) => {
    if (suspiciousParams.some(param => value.toLowerCase().includes(param))) {
      issues.push(`Suspicious query parameter: ${key}=${value}`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

function isValidHeaderValue(value: string): boolean {
  // Basic validation for header values
  return /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(value);
}

// Session timeout utilities
export function getSessionTimeout(): number {
  return parseInt(process.env.SESSION_TIMEOUT || '604800', 10); // 7 days default
}

export function isSessionExpired(createdAt: Date): boolean {
  const timeout = getSessionTimeout();
  const now = new Date();
  const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
  return diffInSeconds > timeout;
}

// CSRF token utilities (for future CSRF protection)
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  // Simple validation - in production, use a more robust method
  return token === sessionToken && token.length === 64;
}
