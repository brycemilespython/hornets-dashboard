import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);

  // If no session, the withMiddlewareAuthRequired will handle the redirect to login
  if (!session?.user) {
    return res;
  }

  // Don't check verification status for these paths
  if (
    req.nextUrl.pathname === '/verify-email' ||
    req.nextUrl.pathname === '/api/auth/verify-email' ||
    req.nextUrl.pathname === '/api/auth/resend-verification'
  ) {
    return res;
  }

  try {
    // Get the Auth0 Management API token
    const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get management API token');
    }

    const { access_token } = await tokenResponse.json();

    // Check user's email verification status
    const userResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${session.user.sub}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get user details');
    }

    const userData = await userResponse.json();

    // If email is not verified, redirect to verification page
    if (!userData.email_verified) {
      return NextResponse.redirect(new URL('/verify-email', req.url));
    }

    return res;
  } catch (error) {
    console.error('Error in middleware:', error);
    // On error, allow the request to continue to avoid blocking users
    return res;
  }
}

export default withMiddlewareAuthRequired(middleware);

export const config = {
  matcher: [
    // Add routes that require authentication
    '/dashboard',
    '/',  // Protect the root/dashboard page
    '/api/players/:path*',  // Protect API routes
    '/((?!api/auth|_next/static|_next/image|favicon.ico|verify-email).*)',
  ],
}; 