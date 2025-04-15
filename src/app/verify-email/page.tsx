'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmail() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      console.log('Checking verification status for user:', user);
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      if (user?.sub) {
        try {
          console.log('Fetching verification status...');
          const response = await fetch(`/api/auth/verify-email?userId=${encodeURIComponent(user.sub)}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Verification status:', data);
            setIsVerified(data.email_verified);
            if (data.email_verified) {
              console.log('Email verified, redirecting to dashboard');
              router.push('/');
            }
          } else {
            console.error('Failed to fetch verification status:', await response.text());
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        } finally {
          setCheckingStatus(false);
        }
      } else {
        console.log('No user ID found');
        setCheckingStatus(false);
      }
    };

    checkVerification();
  }, [user, router]);

  if (isLoading || checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1a105c] mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a105c] mb-4">Verify Your Email</h1>
          {user && (
            <p className="text-sm text-gray-500 mb-4">
              Current email: {user.email}
            </p>
          )}
          <p className="text-gray-600 mb-6">
            Please check your email for a verification link. Once you've verified your email,
            you'll be able to access the dashboard.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              If you haven't received the email, check your spam folder or click below to resend.
            </p>
            <button
              onClick={() => window.location.href = '/api/auth/resend-verification'}
              className="w-full bg-[#1a105c] text-white py-2 px-4 rounded hover:bg-[#2a1f6c] transition-colors"
            >
              Resend Verification Email
            </button>
            <Link
              href="/api/auth/logout"
              className="block text-sm text-[#007487] hover:text-[#005f6b]"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 