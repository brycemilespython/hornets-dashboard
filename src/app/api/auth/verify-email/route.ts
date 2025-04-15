import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  console.log('Starting email verification check...');
  
  try {
    const session = await getSession();
    if (!session?.user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 });
    }

    console.log('User found, getting management token...');
    const response = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        grant_type: 'client_credentials',
        scope: 'read:users read:user_idp_tokens'
      })
    });

    if (!response.ok) {
      console.error('Failed to get management token:', await response.text());
      return NextResponse.json({ error: 'Failed to get management token' }, { status: 500 });
    }

    const { access_token } = await response.json();
    console.log('Got management token, checking user details...');

    const userResponse = await fetch(
      `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${session.user.sub}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      console.error('Failed to get user details:', await userResponse.text());
      return NextResponse.json({ error: 'Failed to get user details' }, { status: 500 });
    }

    const userData = await userResponse.json();
    console.log('Got user details, checking email verification status...');

    return NextResponse.json({
      email_verified: userData.email_verified
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error in verify-email endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 