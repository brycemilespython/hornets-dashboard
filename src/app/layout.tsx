import { Inter } from 'next/font/google';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Charlotte Hornets Dashboard',
  description: 'A secure dashboard showcasing Charlotte Hornets player statistics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
