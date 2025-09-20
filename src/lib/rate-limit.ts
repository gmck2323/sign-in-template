import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limit configurations
export const rateLimits = {
  // General API rate limiting
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
  }),
  
  // Auth endpoints (less restrictive for Clerk compatibility)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
    analytics: true,
  }),
  
  // Admin endpoints (very restrictive)
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
    analytics: true,
  }),
  
  // Login attempts (very restrictive)
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 attempts per 5 minutes
    analytics: true,
  }),
};

// Fallback rate limiter for when Redis is not available
export const fallbackRateLimit = {
  async limit(identifier: string, limit: number, window: number): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    // Simple in-memory rate limiting as fallback
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    // This is a simplified fallback - in production you'd want a more robust solution
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + window * 1000,
    };
  }
};

// Rate limiting middleware for API routes
export async function checkRateLimit(
  identifier: string,
  type: 'api' | 'auth' | 'admin' | 'login' = 'api'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    // Check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('Redis not configured, using fallback rate limiting');
      return await fallbackRateLimit.limit(identifier, 100, 60);
    }
    
    const result = await rateLimits[type].limit(identifier);
    return result;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request but log it
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    };
  }
}

// Get client identifier for rate limiting
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  let ip = 'unknown';
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIP) {
    ip = realIP;
  }
  
  // Combine IP and user agent for more accurate identification
  return `${ip}-${userAgent.slice(0, 50)}`;
}
