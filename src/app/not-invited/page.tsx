'use client';

import Link from 'next/link';

export default function NotInvitedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Not Granted
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your email address is not on the allow list for this application.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What does this mean?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Only pre-approved users can access this application</li>
            <li>• Your email address needs to be added to the allow list</li>
            <li>• Contact your administrator to request access</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Need access? Contact your administrator:
            </p>
            <a
              href="mailto:admin@example.com?subject=Access Request&body=Hi, I would like to request access to the application. My email address is: [your-email@example.com]"
              className="btn btn-primary w-full"
            >
              Request Access
            </a>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Try signing in with a different account
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>
            If you believe this is an error, please contact support with your email address.
          </p>
        </div>
      </div>
    </div>
  );
}
