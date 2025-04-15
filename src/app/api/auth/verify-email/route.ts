import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('Verifying email status...');
    const session = await getSession();
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('Checking userId:', userId);

    if (!userId) {
      console.log('No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the Auth0 Management API token
    console.log('Getting Management API token...');
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
      const errorText = await tokenResponse.text();
      console.error('Failed to get management token:', errorText);
      throw new Error('Failed to get management API token');
    }

    const { access_token } = await tokenResponse.json();
    console.log('Got access token');

    // Get user details from Auth0 Management API
    console.log('Fetching user details...');
    const userResponse = await fetch(
      `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Failed to get user details:', errorText);
      throw new Error('Failed to get user details');
    }

    const userData = await userResponse.json();
    console.log('User verification status:', userData.email_verified);
    
    return NextResponse.json({ 
      email_verified: userData.email_verified,
      email: userData.email 
    });
  } catch (error) {
    console.error('Error checking email verification:', error);
    return NextResponse.json(
      { error: 'Failed to check email verification status' },
      { status: 500 }
    );
  }
} 