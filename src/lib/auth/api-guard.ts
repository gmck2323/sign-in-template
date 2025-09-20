import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { allowListService } from './allowlist';
import { auditLogger } from '../audit/logger';
import { getSignedInEmail } from './user';

export interface AuthenticatedUser {
  email: string;
  role: string;
  display_name?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  request: NextRequest;
}

export async function createAuthGuard(handler: (context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get Clerk auth data
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get user email (with fallbacks)
      const { email } = await getSignedInEmail();
      
      if (!email) {
        await auditLogger.logAuthEvent(
          null,
          'api_deny',
          request.nextUrl.pathname,
          getClientIP(request),
          request.headers.get('user-agent'),
          { error: 'No email in session claims' }
        );

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check allow list
      const allowListResult = await allowListService.isEmailAllowed(email);
      
      if (!allowListResult.allowed) {
        await auditLogger.logAuthEvent(
          email,
          'api_deny',
          request.nextUrl.pathname,
          getClientIP(request),
          request.headers.get('user-agent'),
          { reason: 'not_in_allowlist', active: allowListResult.user?.active }
        );

        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Log successful API access
      await auditLogger.logAuthEvent(
        email,
        'api_allow',
        request.nextUrl.pathname,
        getClientIP(request),
        request.headers.get('user-agent'),
        { role: allowListResult.user?.role }
      );

      // Create auth context
      const context: AuthContext = {
        user: {
          email,
          role: allowListResult.user?.role || 'viewer',
          display_name: allowListResult.user?.display_name || undefined,
        },
        request,
      };

      // Call the actual handler
      return await handler(context);

    } catch (error) {
      console.error('API guard error:', error);
      
      await auditLogger.logAuthEvent(
        null,
        'api_deny',
        request.nextUrl.pathname,
        getClientIP(request),
        request.headers.get('user-agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export function requireRole(requiredRole: string) {
  return (handler: (context: AuthContext) => Promise<NextResponse>) => {
    return createAuthGuard(async (context) => {
      if (context.user.role !== requiredRole) {
        await auditLogger.logAuthEvent(
          context.user.email,
          'api_deny',
          context.request.nextUrl.pathname,
          getClientIP(context.request),
          context.request.headers.get('user-agent'),
          { reason: 'insufficient_permissions', required_role: requiredRole, user_role: context.user.role }
        );

        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return await handler(context);
    });
  };
}

export function requireAdmin(handler: (context: AuthContext) => Promise<NextResponse>) {
  return requireRole('admin')(handler);
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
