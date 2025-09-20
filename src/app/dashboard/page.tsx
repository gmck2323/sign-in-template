'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserProfile {
  email: string;
  display_name: string | null;
  role: string;
  active: boolean;
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/auth/login');
      return;
    }

    if (isLoaded && isSignedIn) {
      fetchUserProfile();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      
      if (response.status === 403) {
        // User not in allow list
        router.push('/not-invited');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const profile = await response.json();
      setUserProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welcome to Your Dashboard!
            </h1>
            <p className="text-lg text-gray-600">
              You've successfully signed in to the secure authentication system
            </p>
          </div>

          {userProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Profile Card */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {(userProfile.display_name || userProfile.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Hello, {userProfile.display_name || userProfile.email.split('@')[0]}! 👋
                      </h2>
                      <p className="text-gray-600">Great to see you here</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">📧</span>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</h3>
                      </div>
                      <p className="text-sm text-gray-900 font-mono">{userProfile.email}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">👑</span>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        userProfile.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : userProfile.role === 'qa'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userProfile.role === 'admin' ? '🔐 Admin' : 
                         userProfile.role === 'qa' ? '🧪 QA' : '👀 Viewer'}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">⚡</span>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        userProfile.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userProfile.active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">🕒</span>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Login Time</h3>
                      </div>
                      <p className="text-sm text-gray-900">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Sidebar */}
              <div className="space-y-6">
                {userProfile.role === 'admin' && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">⚙️</span>
                      Admin Tools
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href="/admin"
                        className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
                      >
                        <span className="mr-2">👥</span>
                        Manage Users
                      </a>
                      <a 
                        href="/admin?tab=audit"
                        className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                      >
                        <span className="mr-2">📊</span>
                        View Audit Logs
                      </a>
                    </div>
                  </div>
                )}

                {/* Fun Stats Card */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="text-2xl mr-2">🎯</span>
                    Your Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-90">Login Streak</span>
                      <span className="font-bold">1 day 🔥</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-90">Security Level</span>
                      <span className="font-bold">Maximum 🛡️</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-90">Access Level</span>
                      <span className="font-bold">
                        {userProfile.role === 'admin' ? 'Full Access' : 
                         userProfile.role === 'qa' ? 'Testing Access' : 'View Only'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">💡</span>
                    Quick Tips
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Your session is secure and encrypted</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span>All actions are logged for security</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Contact support if you need help</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              🚀 Powered by Next.js, Clerk, and PostgreSQL | Built with security in mind
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}