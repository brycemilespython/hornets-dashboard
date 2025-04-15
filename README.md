# Charlotte Hornets Dashboard

A comprehensive dashboard for tracking Charlotte Hornets team and player statistics, built with Next.js and NBA API.

## Features

- **Team Overview**: View current season standings, team statistics, and performance metrics
- **Player Statistics**: Track individual player performance with detailed season averages
- **Game Log**: Access recent game results and upcoming matchups
- **Season Selection**: Choose from seasons 2015-2024 to view historical data
- **Secure Authentication**: Email verification required for access
- **Responsive Design**: Optimized for desktop and mobile viewing

## Authentication Flow

1. **Initial Access**:

   - Users are redirected to the login page
   - Can sign in with existing account or create new account
   - Email verification is required for access

2. **Post-Authentication**:

   - Verified users are redirected to the dashboard
   - Unverified users are redirected to email verification page
   - Verification email can be resent if needed

3. **Protected Routes**:
   - Dashboard and API routes require authentication
   - Static assets and auth-related pages are publicly accessible

## Environment Variables

### Required Variables

```env
# Auth0 Standard Authentication
AUTH0_SECRET
AUTH0_BASE_URL
AUTH0_ISSUER_BASE_URL
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET

# Auth0 Management API (for email verification)
AUTH0_M2M_CLIENT_ID
AUTH0_M2M_CLIENT_SECRET

# NBA API
BALLDONTLIE_API_KEY
```

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/hornets-dashboard.git
   cd hornets-dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   - Create a `.env.local` file in the root directory
   - Add all required environment variables

4. Run the development server:

   ````DEVELOPER SERVER IS NOT FUNCTIONAL AS THIS IS HOSTED AT AN ONLINE URL
   ```bash
   npm run dev
   ````

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Authentication**: Auth0
- **Data Source**: BALLDONTLIEAPI
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── verify-email/     # Email verification page
│   └── layout.tsx        # Root layout
├── components/            # Reusable components
├── lib/                  # Utility functions
└── middleware.ts         # Authentication middleware
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
