import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedInEmail } from '@/lib/auth/user';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withRequestLimits, requestLimitConfigs } from '@/lib/middleware/request-limits';

async function authCallbackHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Get user email from Clerk session (with fallback)
    const { email } = await getSignedInEmail();
    
    if (!email) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Redirect to dashboard - middleware will handle allow list check
    return NextResponse.redirect(new URL('/dashboard', request.url));
    
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const GET = withRequestLimits(requestLimitConfigs.auth)(
  withRateLimit({ type: 'auth' })(authCallbackHandler)
);
