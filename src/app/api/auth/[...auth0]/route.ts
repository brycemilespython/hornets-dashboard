import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  onError(req, error) {
    console.error('Auth0 Error:', error);
    return Response.redirect('/login?error=true');
  }
}); 