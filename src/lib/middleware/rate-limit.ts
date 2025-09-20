import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '../rate-limit';

export interface RateLimitConfig {
  type: 'api' | 'auth' | 'admin' | 'login';
  customIdentifier?: string;
}

export function withRateLimit(config: RateLimitConfig) {
  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      try {
        // Get client identifier
        const identifier = config.customIdentifier || getClientIdentifier(request);
        
        // Check rate limit
        const rateLimitResult = await checkRateLimit(identifier, config.type);
        
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { 
              error: 'Too many requests',
              retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
            },
            { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              }
            }
          );
        }
        
        // Add rate limit headers to response
        const response = await handler(request);
        
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
        
        return response;
        
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        // On error, allow the request but log it
        return await handler(request);
      }
    };
  };
}
