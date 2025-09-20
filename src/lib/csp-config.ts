import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface CSPConfig {
  nonce?: string;
  isDevelopment?: boolean;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function getCSPHeader(config: CSPConfig = {}): string {
  const { nonce = generateNonce(), isDevelopment = process.env.NODE_ENV === 'development' } = config;
  
  const nonceDirective = nonce ? `'nonce-${nonce}'` : '';
  
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${nonceDirective} 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://clerk.com https://*.clerk.com`,
    `img-src 'self' data: https: blob: https://clerk.com https://*.clerk.com`,
    `font-src 'self' https://fonts.gstatic.com https://clerk.com https://*.clerk.com`,
    `connect-src 'self' https://clerk.com https://*.clerk.com https://api.clerk.com https://clerk.dev https://*.clerk.dev wss://*.clerk.com wss://*.clerk.dev`,
    `frame-src 'self' https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev`,
    `worker-src 'self' blob: https://clerk.com https://*.clerk.com`,
    `child-src 'self' blob: https://clerk.com https://*.clerk.com`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://clerk.com https://*.clerk.com`,
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];

  // Add development-specific directives
  if (isDevelopment) {
    directives.push("connect-src 'self' https://clerk.com https://*.clerk.com https://api.clerk.com https://clerk.dev https://*.clerk.dev wss://*.clerk.com wss://*.clerk.dev ws://localhost:* http://localhost:*");
  }

  return directives.join('; ');
}

export function getSecurityHeaders(request: NextRequest): Record<string, string> {
  const nonce = generateNonce();
  
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': getCSPHeader({ nonce, isDevelopment: process.env.NODE_ENV === 'development' }),
  };
}

// Helper to extract nonce from CSP header for use in components
export function extractNonceFromCSP(cspHeader: string): string | null {
  const nonceMatch = cspHeader.match(/script-src[^;]*'nonce-([^']+)'/);
  return nonceMatch ? nonceMatch[1] : null;
}
