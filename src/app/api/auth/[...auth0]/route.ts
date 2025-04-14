import { handleAuth } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export const GET = handleAuth({
  onError(req: NextRequest, error: Error) {
    console.error('Auth0 Error:', error);
    return Response.redirect('/login?error=true');
  }
}); 