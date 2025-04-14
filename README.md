# Charlotte Hornets Dashboard

A secure dashboard showcasing Charlotte Hornets player statistics, built with Next.js, Auth0, and TypeScript.

## Features

- Secure authentication with Auth0
- Real-time player statistics from the Ball Don't Lie API
- Interactive data visualizations
- Responsive design with Tailwind CSS
- Type-safe development with TypeScript

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Auth0 for authentication
- Recharts for data visualization
- Ball Don't Lie API for NBA statistics

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Auth0 account
- Ball Don't Lie API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/hornets-dashboard.git
cd hornets-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:

```env
# Auth0 Configuration
AUTH0_SECRET='your-secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='your-auth0-domain'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'

# Ball Don't Lie API
NEXT_PUBLIC_BALL_DONT_LIE_API_KEY='your-api-key'
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add the following environment variables in Vercel:

   - `AUTH0_SECRET`
   - `AUTH0_BASE_URL` (your production URL)
   - `AUTH0_ISSUER_BASE_URL`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `NEXT_PUBLIC_BALL_DONT_LIE_API_KEY`

4. Deploy!

## Auth0 Configuration

1. Create an Auth0 application
2. Configure the following in Auth0 dashboard:
   - Allowed Callback URLs: `https://your-domain/api/auth/callback`
   - Allowed Logout URLs: `https://your-domain`
   - Allowed Web Origins: `https://your-domain`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
