'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Login() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1a105c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <img 
            src="/Charlotte_Hornets_(2014).webp" 
            alt="Charlotte Hornets Logo" 
            className="h-24 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-[#1a105c] mb-4">Welcome to Hornets Dashboard</h1>
          <p className="text-gray-600 mb-8">
            Sign in or create an account to access the dashboard
          </p>
          <a
            href="/api/auth/login"
            className="block w-full bg-[#1a105c] text-white py-2 px-4 rounded hover:bg-[#2a1f6c] transition-colors"
          >
            Sign In / Sign Up
          </a>
        </div>
      </div>
    </div>
  );
} 