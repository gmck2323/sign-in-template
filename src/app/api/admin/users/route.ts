import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedInEmail } from '@/lib/auth/user';
import { allowListService } from '@/lib/auth/allowlist';
import { auditLogger } from '@/lib/audit/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withRequestLimits, requestLimitConfigs } from '@/lib/middleware/request-limits';
import { withInputSanitization, sanitizationConfigs } from '@/lib/middleware/input-sanitization';
import { withCSRFProtection, csrfConfigs } from '@/lib/csrf-protection';

async function requireAdmin(handler: (context: { user: { email: string; role: string }; request: NextRequest }) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { email } = await getSignedInEmail();
      
      if (!email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check allow list and role
      const allowListResult = await allowListService.isEmailAllowed(email);
      
      if (!allowListResult.allowed || !allowListResult.user) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      if (allowListResult.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return await handler({
        user: {
          email: allowListResult.user.email,
          role: allowListResult.user.role,
        },
        request,
      });

    } catch (error) {
      console.error('Admin auth error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

async function getUsersHandler(request: NextRequest) {
  const adminHandler = await requireAdmin(async (context) => {
    try {
      const { users, error } = await allowListService.getAllUsers();
      
      if (error) {
        return NextResponse.json(
          { error },
          { status: 500 }
        );
      }

      return NextResponse.json({ users });

    } catch (error) {
      console.error('Get users error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });

  return adminHandler(request);
}

async function postUsersHandler(request: NextRequest) {
  const adminHandler = await requireAdmin(async (context) => {
    try {
      const { email, display_name, role } = await context.request.json();

      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      const result = await allowListService.addUser(
        email,
        display_name || '',
        role || 'viewer',
        context.user.email
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Log admin action
      await auditLogger.logAdminEvent(
        context.user.email,
        'admin_add_user',
        context.request.nextUrl.pathname,
        getClientIP(context.request),
        context.request.headers.get('user-agent'),
        { added_email: email, role }
      );

      return NextResponse.json({
        success: true,
        message: 'User added successfully',
      });

    } catch (error) {
      console.error('Add user error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });

  return adminHandler(request);
}

export const GET = withRequestLimits(requestLimitConfigs.admin)(
  withRateLimit({ type: 'admin' })(getUsersHandler)
);
export const POST = withCSRFProtection(csrfConfigs.strict)(
  withInputSanitization(sanitizationConfigs.admin)(
    withRequestLimits(requestLimitConfigs.admin)(
      withRateLimit({ type: 'admin' })(postUsersHandler)
    )
  )
);

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
