import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired({
  returnTo: '/login'
});

export const config = {
  matcher: [
    '/dashboard',
    '/api/players/:path*'
  ]
}; 