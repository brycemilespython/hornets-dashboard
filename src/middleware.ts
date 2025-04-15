import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

// Helper to handle CORS preflight requests
function corsResponse(origin: string) {
  const response = new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
  return response;
}

export default withMiddlewareAuthRequired({
  returnTo: '/login',
  async middleware(req) {
    const origin = req.headers.get('origin') || '';
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return corsResponse(origin);
    }

    // Add CORS headers to all responses
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
});

export const config = {
  matcher: [
    '/dashboard',
    '/api/players/:path*',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
    '/((?!api/auth/callback|api/auth/login|api/auth/logout|_next/static|_next/image|favicon.ico).*)'
  ]
}; 