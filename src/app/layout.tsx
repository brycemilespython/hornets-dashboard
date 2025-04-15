import { Inter } from 'next/font/google';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Hornets Dashboard',
  description: 'Charlotte Hornets Team Statistics Dashboard',
  icons: {
    icon: [
      { url: '/Charlotte_Hornets_(2014).webp', type: 'image/webp' },
      { url: 'https://www.nba.com/hornets/sites/hornets/files/favicon.ico', type: 'image/x-icon' }
    ],
    shortcut: '/Charlotte_Hornets_(2014).webp',
    apple: '/Charlotte_Hornets_(2014).webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="icon" 
          href="https://www.nba.com/hornets/sites/hornets/files/favicon.ico" 
          type="image/x-icon"
        />
      </head>
      <UserProvider>
        <body>{children}</body>
      </UserProvider>
    </html>
  );
}
