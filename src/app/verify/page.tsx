'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VerifyEmail() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.email_verified) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1a105c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification email to {user?.email}. Please check your inbox and click the verification link to continue.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                If you haven't received the email, check your spam folder or click below to resend.
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => {
                const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL;
                const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
                const redirectUri = window.location.origin + '/verify';
                
                const verificationUrl = `${auth0Domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&prompt=verify_email`;
                window.location.href = verificationUrl;
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1a105c] hover:bg-[#2a1f6c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a105c]"
            >
              Resend Verification Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 