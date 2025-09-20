'use client';

import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
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
          <SignIn 
            routing="path"
            path="/auth/login"
            signUpUrl="/auth/login"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have access?{' '}
            <a href="mailto:admin@example.com" className="font-medium text-primary-600 hover:text-primary-500">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
