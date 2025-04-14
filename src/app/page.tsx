'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface PlayerStats {
  id: number;
  first_name: string;
  last_name: string;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
}

export default function Dashboard() {
  const { user, error, isLoading } = useUser();
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        const response = await axios.get('https://api.balldontlie.io/v1/players', {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY}`
          },
          params: {
            team_ids: [1610612766] // Charlotte Hornets team ID
          }
        });
        setPlayerStats(response.data.data);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      }
    };

    fetchPlayerStats();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Charlotte Hornets Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">{user.name}</span>
                  <a
                    href="/api/auth/logout"
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                  >
                    Logout
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/login"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Login
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {user ? (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Player Statistics</h2>
              <div className="h-96">
                <BarChart
                  width={800}
                  height={400}
                  data={playerStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="last_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="points_per_game" fill="#8884d8" name="Points per Game" />
                  <Bar dataKey="rebounds_per_game" fill="#82ca9d" name="Rebounds per Game" />
                  <Bar dataKey="assists_per_game" fill="#ffc658" name="Assists per Game" />
                </BarChart>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to the Charlotte Hornets Dashboard</h2>
            <p className="text-gray-600 mb-8">Please login to view player statistics</p>
            <a
              href="/api/auth/login"
              className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600"
            >
              Login
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
