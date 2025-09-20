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

export async function GET(request: NextRequest) {
  const adminHandler = await requireAdmin(async (context) => {
    try {
      const { searchParams } = context.request.nextUrl;
      
      const query = {
        email: searchParams.get('email') || undefined,
        event: searchParams.get('event') as any || undefined,
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      };

      const { logs, total, error } = await auditLogger.getAuditLogs(query);
      
      if (error) {
        return NextResponse.json(
          { error },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        logs, 
        total,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total,
          pages: Math.ceil(total / query.limit),
        }
      });

    } catch (error) {
      console.error('Get audit logs error:', error);
      
      return NextResponse.json(
        { error: 'Failed to get audit logs' },
        { status: 500 }
      );
    }
  });

  return adminHandler(request);
}
