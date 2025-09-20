import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { validateSessionRequest } from '@/lib/session-security';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/not-invited',
  '/health',
  '/api/health',
  '/api/auth(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip session validation for auth routes and API auth routes to avoid interfering with Clerk
  if (!req.nextUrl.pathname.startsWith('/auth') && !req.nextUrl.pathname.startsWith('/api/auth')) {
    // Validate session security for non-auth routes
    const sessionValidation = validateSessionRequest(req);
    if (!sessionValidation.isValid) {
      console.warn('Session security issues detected:', sessionValidation.issues);
      // Log security issues but don't block requests in development
      if (process.env.NODE_ENV === 'production') {
        return new Response('Security validation failed', { status: 400 });
      }
    }
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    return;
  }

  // For protected routes, let Clerk handle the authentication
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
