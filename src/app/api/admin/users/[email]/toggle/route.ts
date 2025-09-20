import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedInEmail } from '@/lib/auth/user';
import { allowListService } from '@/lib/auth/allowlist';
import { auditLogger } from '@/lib/audit/logger';

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
          { error: 'No email in session' },
          { status: 401 }
        );
      }

      // Check allow list and role
      const allowListResult = await allowListService.isEmailAllowed(email);
      
      if (!allowListResult.allowed || !allowListResult.user) {
        return NextResponse.json(
          { error: 'User not found in allow list' },
          { status: 403 }
        );
      }

      if (allowListResult.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin role required' },
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
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const adminHandler = await requireAdmin(async (context) => {
    try {
      const resolvedParams = await params;
      const email = decodeURIComponent(resolvedParams.email);

      const result = await allowListService.toggleUserStatus(email);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Log admin action
      await auditLogger.logAdminEvent(
        context.user.email,
        'admin_toggle_user',
        context.request.nextUrl.pathname,
        getClientIP(context.request),
        context.request.headers.get('user-agent'),
        { 
          toggled_email: email, 
          new_status: result.newStatus 
        }
      );

      return NextResponse.json({
        success: true,
        message: 'User status updated successfully',
        newStatus: result.newStatus,
      });

    } catch (error) {
      console.error('Toggle user status error:', error);
      
      return NextResponse.json(
        { error: 'Failed to toggle user status' },
        { status: 500 }
      );
    }
  });

  return adminHandler(request);
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
