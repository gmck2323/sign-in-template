'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { setupCSPViolationReporting, checkClerkResources, logCSPHeaders } from '@/lib/csp-debug';

export default function LoginPage() {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up CSP debugging in development
    if (process.env.NODE_ENV === 'development') {
      setupCSPViolationReporting();
      checkClerkResources();
      logCSPHeaders();
    }

    // Set up Clerk load detection
    const checkClerkLoad = () => {
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        setClerkLoaded(true);
        setError(null);
      } else {
        // Retry after a short delay
        setTimeout(checkClerkLoad, 100);
      }
    };

    // Start checking for Clerk after a short delay
    const timer = setTimeout(checkClerkLoad, 500);

    // Set a timeout to show error if Clerk doesn't load
    const errorTimer = setTimeout(() => {
      if (!clerkLoaded) {
        setError('Clerk authentication failed to load. Please check your network connection and try again.');
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(errorTimer);
    };
  }, [clerkLoaded]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use your email to sign in
          </p>
        </div>
        
        <div className="mt-8">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-2 text-red-600 hover:text-red-500 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !clerkLoaded ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Loading Authentication</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Please wait while we load the authentication system...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <SignIn 
              routing="path"
              path="/auth/login"
              signUpUrl="/auth/login"
              afterSignInUrl="/dashboard"
              afterSignUpUrl="/dashboard"
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                  card: 'shadow-lg',
                  headerTitle: 'text-gray-900',
                  headerSubtitle: 'text-gray-600',
                }
              }}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have access?{' '}
            <a href="mailto:admin@example.com" className="font-medium text-primary-600 hover:text-primary-500">
              Contact your administrator
            </a>
          </p>
        </div>

        {/* Development debugging info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• Clerk Loaded: {clerkLoaded ? '✅ Yes' : '❌ No'}</p>
              <p>• Check browser console for CSP violations and Clerk resource loading status</p>
              <p>• If Clerk fails to load, check network tab for blocked requests</p>
              <p>• Verify environment variables are set correctly</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
