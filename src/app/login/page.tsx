'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a105c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="flex flex-col items-center">
          <Image
            src="/Charlotte_Hornets_(2014).webp"
            alt="Charlotte Hornets Logo"
            width={120}
            height={120}
            className="mb-6"
          />
          <h2 className="text-3xl font-extrabold text-[#1a105c]">
            Hornets Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access team statistics and analytics
          </p>
        </div>
        <div className="mt-8">
          <a
            href="/api/auth/login"
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#1a105c] hover:bg-[#007487] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007487] transition-colors duration-200"
          >
            Sign in to continue
          </a>
        </div>
        <div className="mt-6">
          <p className="text-center text-sm text-gray-500">
            Secure authentication powered by{' '}
            <span className="text-[#007487]">Auth0</span>
          </p>
        </div>
        <div id="auth-error" className="mt-4 text-center text-sm text-red-600 hidden">
          Authentication error. Please try again.
        </div>
      </div>
    </div>
  );
} 