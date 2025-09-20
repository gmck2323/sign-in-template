import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint can be used to initiate login flow
  // For Clerk, we just redirect to the login page
  return NextResponse.redirect(new URL('/auth/login', request.url));
}
