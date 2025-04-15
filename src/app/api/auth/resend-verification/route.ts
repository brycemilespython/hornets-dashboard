import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Validate required environment variables
const requiredEnvVars = [
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_M2M_CLIENT_ID',
  'AUTH0_M2M_CLIENT_SECRET',
  'AUTH0_BASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      console.error('Token response error:', await tokenResponse.text());
      throw new Error('Failed to get management API token');
    }

    const { access_token } = await tokenResponse.json();

    // Send verification email using Auth0 Management API
    const verificationResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/jobs/verification-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.sub,
        }),
      }
    );

    if (!verificationResponse.ok) {
      console.error('Verification response error:', await verificationResponse.text());
      throw new Error('Failed to send verification email');
    }

    // Redirect back to verify-email page after sending
    return NextResponse.redirect(`${process.env.AUTH0_BASE_URL}/verify-email`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
} 