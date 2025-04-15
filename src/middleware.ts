import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

export default withMiddlewareAuthRequired({
  returnTo: '/login',
  async middleware(req) {
    try {
      const res = NextResponse.next();
      const session = await getSession(req, res);
      
      // If user is not verified, redirect to Auth0's verification page
      if (session?.user && !session.user.email_verified) {
        const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL;
        const clientId = process.env.AUTH0_CLIENT_ID;
        const baseUrl = process.env.AUTH0_BASE_URL;
        
        if (!auth0Domain || !clientId || !baseUrl) {
          console.error('Missing required environment variables');
          return res;
        }
        
        const redirectUri = `${baseUrl}/verify`;
        const verificationUrl = `${auth0Domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&prompt=verify_email&screen_hint=signup`;
        
        return NextResponse.redirect(verificationUrl);
      }
      
      return res;
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.next();
    }
  }
});

export const config = {
  matcher: ['/dashboard', '/api/players/:path*', '/']
}; 