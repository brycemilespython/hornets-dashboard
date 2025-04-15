import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the Auth0 Management API token
    const tokenResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get management API token');
    }

    const { access_token } = await tokenResponse.json();

    // Get user details from Auth0 Management API
    const userResponse = await fetch(
      `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
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
    
    return NextResponse.json({ email_verified: userData.email_verified });
  } catch (error) {
    console.error('Error checking email verification:', error);
    return NextResponse.json(
      { error: 'Failed to check email verification status' },
      { status: 500 }
    );
  }
} 