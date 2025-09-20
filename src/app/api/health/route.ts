import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withRequestLimits, requestLimitConfigs } from '@/lib/middleware/request-limits';

async function healthHandler() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const GET = withRequestLimits(requestLimitConfigs.api)(
  withRateLimit({ type: 'api' })(healthHandler)
);
