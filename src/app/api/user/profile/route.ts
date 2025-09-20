import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedInEmail } from '@/lib/auth/user';
import { allowListService } from '@/lib/auth/allowlist';

export async function GET() {
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

    // Get user from allow list
    const allowListResult = await allowListService.isEmailAllowed(email);
    
    if (!allowListResult.allowed || !allowListResult.user) {
      return NextResponse.json(
        { error: 'User not found in allow list' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      email: allowListResult.user.email,
      display_name: allowListResult.user.display_name,
      role: allowListResult.user.role,
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}
