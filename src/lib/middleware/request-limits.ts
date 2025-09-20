import { NextRequest, NextResponse } from 'next/server';

export interface RequestLimitConfig {
  maxBodySize?: number; // in bytes
  maxUrlLength?: number;
  maxHeadersSize?: number;
}

const DEFAULT_LIMITS: RequestLimitConfig = {
  maxBodySize: 1024 * 1024, // 1MB
  maxUrlLength: 2048, // 2KB
  maxHeadersSize: 8192, // 8KB
};

export function withRequestLimits(config: RequestLimitConfig = {}) {
  const limits = { ...DEFAULT_LIMITS, ...config };
  
  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      try {
        // Check URL length
        if (limits.maxUrlLength && request.url.length > limits.maxUrlLength) {
          return NextResponse.json(
            { error: 'Request URL too long' },
            { status: 414 }
          );
        }
        
        // Check headers size
        if (limits.maxHeadersSize) {
          const headersSize = Array.from(request.headers.entries())
            .reduce((size, [key, value]) => size + key.length + value.length + 4, 0);
          
          if (headersSize > limits.maxHeadersSize) {
            return NextResponse.json(
              { error: 'Request headers too large' },
              { status: 413 }
            );
          }
        }
        
        // Check body size for POST/PUT/PATCH requests
        if (limits.maxBodySize && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          const contentLength = request.headers.get('content-length');
          
          if (contentLength && parseInt(contentLength) > limits.maxBodySize) {
            return NextResponse.json(
              { error: 'Request body too large' },
              { 
                status: 413,
                headers: {
                  'Retry-After': '60' // Suggest retry after 60 seconds
                }
              }
            );
          }
        }
        
        return await handler(request);
        
      } catch (error) {
        console.error('Request limits middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// Predefined limit configurations for different endpoint types
export const requestLimitConfigs = {
  // General API endpoints
  api: {
    maxBodySize: 1024 * 1024, // 1MB
    maxUrlLength: 2048,
    maxHeadersSize: 8192,
  },
  
  // Auth endpoints (smaller limits)
  auth: {
    maxBodySize: 512 * 1024, // 512KB
    maxUrlLength: 1024,
    maxHeadersSize: 4096,
  },
  
  // Admin endpoints (moderate limits)
  admin: {
    maxBodySize: 2 * 1024 * 1024, // 2MB
    maxUrlLength: 4096,
    maxHeadersSize: 16384,
  },
  
  // File upload endpoints (larger limits)
  upload: {
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxUrlLength: 2048,
    maxHeadersSize: 8192,
  },
};
