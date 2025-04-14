'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

interface TeamData {
  id: number;
  full_name: string;
  name: string;
  city: string;
  conference: string;
  division: string;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string;
  weight: string;
  jersey_number: string;
  college: string;
  country: string;
  draft_year: number;
  draft_round: number;
  draft_number: number;
  team: {
    id: number;
    conference: string;
    division: string;
    city: string;
    name: string;
    full_name: string;
    abbreviation: string;
  };
  average_points?: string;
  games_played?: number;
  minutes?: string;
  field_goal_pct?: string;
  three_point_pct?: string;
  free_throw_pct?: string;
  rebounds?: string;
  assists?: string;
  steals?: string;
  blocks?: string;
  turnovers?: string;
  personal_fouls?: string;
}

interface GameStats {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  min: string;
  turnover: number;
  pf: number;
  player: {
    id: number;
  };
  game: {
    id: number;
    date: string;
  };
  team: {
    id: number;
    abbreviation: string;
  };
}

interface StatsResponse {
  data: GameStats[];
  meta: {
    next_cursor: number | null;
    per_page: number;
  };
}

interface ComparisonData {
  players: Array<{
    id: number;
    name: string;
    position: string;
    stats: {
      [key: string]: {
        value: number;
        rank?: number;
        percentile?: number;
      };
    };
  }>;
  comparisons: Record<string, never>; // Empty object type
}

export default function Dashboard() {
  const { user, error: authError, isLoading: authLoading } = useUser();
  const router = useRouter();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortBy, setSortBy] = useState<'fg_pct' | 'three_pct'>('fg_pct');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'games_played', direction: 'descending' });
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    teamInfo: true,
    playerTable: true,
    leaderboard: true,
    shootingEfficiency: true,
    pointsDistribution: true,
    performanceRadar: true,
    statsLoaded: false
  });
  const [gameLogPlayer, setGameLogPlayer] = useState<Player | null>(null);
  const [gameLogData, setGameLogData] = useState<GameStats[]>([]);
  const gameLogRef = useRef<HTMLDivElement>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(2024);
  const availableSeasons = Array.from({ length: 10 }, (_, i) => 2024 - i);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      const fetchHornetsData = async () => {
        setLoading(true);
        setError(null);
        setLoadingStates({
          teamInfo: true,
          playerTable: true,
          leaderboard: true,
          shootingEfficiency: true,
          pointsDistribution: true,
          performanceRadar: true,
          statsLoaded: false
        });

        try {
          console.log('Starting API requests...');
          
          if (!process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY) {
            throw new Error('Ball Don\'t Lie API key is not configured');
          }
          
          // First, get the team data
          const teamResponse = await axios.get('https://api.balldontlie.io/v1/teams', {
            headers: {
              'Authorization': process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY
            }
          }).catch(error => {
            console.error('Team API Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch team data. Please try again later.');
          });
          
          const hornetsData = teamResponse.data.data.find(
            (team: TeamData) => team.name === 'Hornets' || team.full_name === 'Charlotte Hornets'
          );
          
          if (!hornetsData) {
            throw new Error('Hornets team data not found in API response');
          }

          setTeamData(hornetsData);
          setLoadingStates(prev => ({ ...prev, teamInfo: false }));
          console.log('Found Hornets team:', hornetsData);

          // Then, get all players for the Hornets
          const playersResponse = await axios.get('https://api.balldontlie.io/v1/players', {
            params: {
              team_ids: [hornetsData.id],
              per_page: 100
            },
            headers: {
              'Authorization': process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY
            }
          });

          console.log('Players response:', playersResponse.data);
          // Filter players to only include those with all five details
          const playersWithCompleteDetails = playersResponse.data.data.filter((player: Player) => 
            player.position && player.position.trim() !== '' &&
            player.height && player.height.trim() !== '' &&
            player.weight && player.weight.trim() !== '' &&
            player.jersey_number && player.jersey_number.trim() !== '' &&
            player.college && player.college.trim() !== ''
          );

          setPlayers(playersWithCompleteDetails);
          setLoadingStates(prev => ({ ...prev, playerTable: false, leaderboard: false }));

          // Get stats for all players
          const playerIds = playersWithCompleteDetails.map((player: Player) => player.id);
          let allStats: GameStats[] = [];
          let hasMore = true;
          let cursor = null;

          while (hasMore) {
            const statsResponse: StatsResponse = await axios.get<StatsResponse>('https://api.balldontlie.io/v1/stats', {
              params: {
                player_ids: playerIds,
                seasons: [selectedSeason],
                per_page: 100,
                cursor: cursor
              },
              headers: {
                'Authorization': process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY
              }
            }).then(response => response.data);

            allStats = [...allStats, ...statsResponse.data];
            cursor = statsResponse.meta.next_cursor;
            hasMore = !!cursor && statsResponse.data.length > 0;

            console.log(`Fetched ${statsResponse.data.length} stats, total so far: ${allStats.length}`);
          }

          console.log(`Total stats fetched: ${allStats.length}`);
          setLoadingStates(prev => ({ ...prev, statsLoaded: true }));

          // Calculate averages for each player
          const playersWithStats = playersWithCompleteDetails.map((player: Player) => {
            const playerStats = allStats.filter(stat => stat.player.id === player.id);
            
            if (playerStats.length === 0) {
              return {
                ...player,
                average_points: '-',
                games_played: 0,
                minutes: '-',
                field_goal_pct: '-',
                three_point_pct: '-',
                rebounds: '-',
                assists: '-',
                steals: '-',
                blocks: '-',
                turnovers: '-',
                personal_fouls: '-'
              };
            }

            const totalGames = playerStats.length;
            const averages = {
              points: (playerStats.reduce((sum, stat) => sum + stat.pts, 0) / totalGames).toFixed(1),
              rebounds: (playerStats.reduce((sum, stat) => sum + stat.reb, 0) / totalGames).toFixed(1),
              assists: (playerStats.reduce((sum, stat) => sum + stat.ast, 0) / totalGames).toFixed(1),
              steals: (playerStats.reduce((sum, stat) => sum + stat.stl, 0) / totalGames).toFixed(1),
              blocks: (playerStats.reduce((sum, stat) => sum + stat.blk, 0) / totalGames).toFixed(1),
              field_goal_pct: (playerStats.reduce((sum, stat) => sum + stat.fg_pct, 0) / totalGames * 100).toFixed(1),
              three_point_pct: (playerStats.reduce((sum, stat) => sum + stat.fg3_pct, 0) / totalGames * 100).toFixed(1),
              free_throw_pct: (playerStats.reduce((sum, stat) => sum + stat.ft_pct, 0) / totalGames * 100).toFixed(1),
              minutes: (playerStats.reduce((sum, stat) => sum + parseFloat(stat.min), 0) / totalGames).toFixed(1),
              turnovers: (playerStats.reduce((sum, stat) => sum + stat.turnover, 0) / totalGames).toFixed(1),
              personal_fouls: (playerStats.reduce((sum, stat) => sum + stat.pf, 0) / totalGames).toFixed(1)
            };

            return {
              ...player,
              average_points: averages.points,
              games_played: totalGames,
              minutes: averages.minutes,
              field_goal_pct: averages.field_goal_pct,
              three_point_pct: averages.three_point_pct,
              free_throw_pct: averages.free_throw_pct,
              rebounds: averages.rebounds,
              assists: averages.assists,
              steals: averages.steals,
              blocks: averages.blocks,
              turnovers: averages.turnovers,
              personal_fouls: averages.personal_fouls
            };
          });

          // Filter out players with 0 games played
          const activePlayers = playersWithStats.filter((player: Player) => 
            typeof player.games_played === 'number' && player.games_played > 0
          );
          console.log(`Filtered out ${playersWithStats.length - activePlayers.length} players with 0 games played`);

          // Sort players by games played, then minutes, then points
          const sortedPlayers = activePlayers.sort((a: Player, b: Player) => {
            // First sort by games played
            if (a.games_played !== b.games_played) {
              return (b.games_played || 0) - (a.games_played || 0);
            }
            
            // Then by minutes per game
            const aMin = parseFloat(a.minutes || '0');
            const bMin = parseFloat(b.minutes || '0');
            if (aMin !== bMin) {
              return bMin - aMin;
            }
            
            // Finally by points per game
            const aPts = parseFloat(a.average_points || '0');
            const bPts = parseFloat(b.average_points || '0');
            return bPts - aPts;
          });

          console.log('Active players with stats:', sortedPlayers);
          setPlayers(sortedPlayers);
          setLoading(false);
        } catch (err: any) {
          console.error('Error details:', {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            stack: err.stack
          });
          setError(`Failed to fetch data: ${err.message}`);
          setLoading(false);
          setLoadingStates(prev => ({
            ...prev,
            teamInfo: false,
            playerTable: false,
            leaderboard: false,
            shootingEfficiency: false,
            pointsDistribution: false,
            performanceRadar: false
          }));
        }
      };

      fetchHornetsData();
    }
  }, [authLoading, user, selectedSeason]);

  // Prepare data for the shooting efficiency chart
  const shootingData = players
    .map(player => ({
      name: `${player.first_name} ${player.last_name}`,
      fg_pct: parseFloat(player.field_goal_pct || '0'),
      three_pct: parseFloat(player.three_point_pct || '0')
    }))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  // Add this function to calculate max values and domains
  const calculateStatDomains = (players: Player[]) => {
    const domains = {
      points: Math.ceil(Math.max(...players.map(p => parseFloat(p.average_points || '0')))),
      rebounds: Math.ceil(Math.max(...players.map(p => parseFloat(p.rebounds || '0')))),
      assists: Math.ceil(Math.max(...players.map(p => parseFloat(p.assists || '0')))),
      steals: Math.ceil(Math.max(...players.map(p => parseFloat(p.steals || '0')))),
      blocks: Math.ceil(Math.max(...players.map(p => parseFloat(p.blocks || '0'))))
    };
    return domains;
  };

  // Update the getRadarData function to calculate percentages
  const getRadarData = (player: Player, domains: Record<string, number>) => {
    return [
      {
        subject: 'Points',
        value: Math.round((parseFloat(player.average_points || '0') / domains.points) * 100),
        fullMark: 100,
        actualValue: parseFloat(player.average_points || '0').toFixed(1),
        maxValue: domains.points
      },
      {
        subject: 'Rebounds',
        value: Math.round((parseFloat(player.rebounds || '0') / domains.rebounds) * 100),
        fullMark: 100,
        actualValue: parseFloat(player.rebounds || '0').toFixed(1),
        maxValue: domains.rebounds
      },
      {
        subject: 'Assists',
        value: Math.round((parseFloat(player.assists || '0') / domains.assists) * 100),
        fullMark: 100,
        actualValue: parseFloat(player.assists || '0').toFixed(1),
        maxValue: domains.assists
      },
      {
        subject: 'Steals',
        value: Math.round((parseFloat(player.steals || '0') / domains.steals) * 100),
        fullMark: 100,
        actualValue: parseFloat(player.steals || '0').toFixed(1),
        maxValue: domains.steals
      },
      {
        subject: 'Blocks',
        value: Math.round((parseFloat(player.blocks || '0') / domains.blocks) * 100),
        fullMark: 100,
        actualValue: parseFloat(player.blocks || '0').toFixed(1),
        maxValue: domains.blocks
      }
    ];
  };

  // Prepare data for the points distribution chart
  const pointsData = players
    .map(player => ({
      name: `${player.first_name} ${player.last_name}`,
      points: parseFloat(player.average_points || '0')
    }))
    .sort((a, b) => b.points - a.points);

  // Sort function for the players table
  const sortPlayers = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPlayers = () => {
    if (!sortConfig.key) return players;

    // Define numeric columns
    const numericColumns = [
      'games_played', 'minutes', 'average_points', 'rebounds', 'assists',
      'steals', 'blocks', 'turnovers', 'personal_fouls', 'jersey_number', 'weight',
      'field_goal_pct', 'three_point_pct', 'free_throw_pct'
    ];

    return [...players].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Player];
      const bValue = b[sortConfig.key as keyof Player];

      // Handle numeric columns
      if (numericColumns.includes(sortConfig.key)) {
        const aNum = parseFloat(aValue as string || '0');
        const bNum = parseFloat(bValue as string || '0');
        return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }

      // Handle string values (for non-numeric columns)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  // Add this function to test the comparison API
  const testComparison = async () => {
    try {
      setComparisonLoading(true);
      setComparisonError(null);
      
      // Get the selected players from our existing data
      const selectedPlayersData = players.filter(player => selectedPlayers.includes(player.id));
      
      if (selectedPlayersData.length < 2) {
        throw new Error('Please select at least 2 players to compare');
      }

      // Format the data for the comparison table
      const comparisonData: ComparisonData = {
        players: selectedPlayersData.map(player => ({
          id: player.id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          stats: {
            points: { 
              value: parseFloat(parseFloat(player.average_points || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            rebounds: { 
              value: parseFloat(parseFloat(player.rebounds || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            assists: { 
              value: parseFloat(parseFloat(player.assists || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            steals: { 
              value: parseFloat(parseFloat(player.steals || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            blocks: { 
              value: parseFloat(parseFloat(player.blocks || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            field_goal_pct: { 
              value: parseFloat(parseFloat(player.field_goal_pct || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            three_point_pct: { 
              value: parseFloat(parseFloat(player.three_point_pct || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            free_throw_pct: { 
              value: parseFloat(parseFloat(player.free_throw_pct || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            minutes: { 
              value: parseFloat(parseFloat(player.minutes || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            games_played: { 
              value: player.games_played || 0,
              rank: 0,
              percentile: 0
            },
            turnovers: { 
              value: parseFloat(parseFloat(player.turnovers || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            },
            personal_fouls: { 
              value: parseFloat(parseFloat(player.personal_fouls || '0').toFixed(1)),
              rank: 0,
              percentile: 0
            }
          }
        })),
        comparisons: {}
      };

      setComparisonData(comparisonData);
    } catch (error) {
      console.error('Error in comparison:', error);
      setComparisonError(error instanceof Error ? error.message : 'An error occurred');
      setComparisonData(null);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Add loading components for each section
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a105c]"></div>
    </div>
  );

  const LoadingBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className="bg-[#1a105c] h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
    </div>
  );

  // Calculate domains once for all players
  const statDomains = calculateStatDomains(players);

  // Update the data preparation functions
  const prepareCountingStatsTornadoData = (players: ComparisonData['players']) => {
    if (players.length !== 2) return [];
    
    const stats = [
      { key: 'points', label: 'Points' },
      { key: 'rebounds', label: 'Rebounds' },
      { key: 'assists', label: 'Assists' },
      { key: 'steals', label: 'Steals' },
      { key: 'blocks', label: 'Blocks' }
    ];

    return stats.map(({ key, label }) => {
      const value1 = players[0].stats[key].value;
      const value2 = players[1].stats[key].value;
      const better = value1 >= value2 ? 0 : 1;

      return {
        stat: label,
        [players[0].name]: value1,
        [players[1].name]: value2,
        better
      };
    });
  };

  const prepareShootingStatsTornadoData = (players: ComparisonData['players']) => {
    if (players.length !== 2) return [];
    
    const stats = [
      { key: 'field_goal_pct', label: 'FG%' },
      { key: 'three_point_pct', label: '3P%' },
      { key: 'free_throw_pct', label: 'FT%' }
    ];

    return stats.map(({ key, label }) => {
      const value1 = players[0].stats[key].value;
      const value2 = players[1].stats[key].value;
      const better = value1 >= value2 ? 0 : 1;

      return {
        stat: label,
        [players[0].name]: value1,
        [players[1].name]: value2,
        better
      };
    });
  };

  // Update the handleGameLogClick function
  const handleGameLogClick = async (playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    try {
      const response = await axios.get('https://api.balldontlie.io/v1/stats', {
        params: {
          player_ids: [playerId],
          seasons: [2024],
          per_page: 100
        },
        headers: {
          'Authorization': process.env.NEXT_PUBLIC_BALL_DONT_LIE_API_KEY
        }
      });

      const gameStats = response.data.data.sort((a: GameStats, b: GameStats) => 
        new Date(b.game.date).getTime() - new Date(a.game.date).getTime()
      );

      setGameLogPlayer(player);
      setGameLogData(gameStats);

      // Scroll to game log after a short delay to ensure it's rendered
      setTimeout(() => {
        gameLogRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error fetching game log:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1a105c]"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{authError.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#1a105c] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-white text-xl font-bold">Charlotte Hornets Dashboard</h1>
            </div>
                <div className="flex items-center space-x-4">
              <img 
                src="/Charlotte_Hornets_(2014).webp" 
                alt="Charlotte Hornets Logo" 
                className="h-12 w-auto"
              />
              <div className="flex items-center space-x-2">
                <img 
                  src={user.picture || ''} 
                  alt={user.name || ''} 
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-white">{user.name}</span>
                  <a
                    href="/api/auth/logout"
                  className="text-white hover:text-gray-200"
                  >
                    Logout
                  </a>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!error && (
          <div className="space-y-6">
            {/* Team Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#1a105c]">Team Information</h2>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="season-select" className="text-sm font-medium text-[#007487]">
                      Season
                    </label>
                    <select
                      id="season-select"
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                      className="block rounded-md border-gray-300 shadow-sm focus:border-[#007487] focus:ring-[#007487] sm:text-sm"
                    >
                      {availableSeasons.map((season) => (
                        <option key={season} value={season}>
                          {season}-{(season + 1).toString().slice(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {loadingStates.teamInfo ? (
                  <LoadingBar />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <dl>
                        <div className="mb-4">
                          <dt className="text-sm font-medium text-[#007487]">Full Name</dt>
                          <dd className="mt-1 text-lg text-[#1a105c]">{teamData?.full_name}</dd>
                        </div>
                        <div className="mb-4">
                          <dt className="text-sm font-medium text-[#007487]">City</dt>
                          <dd className="mt-1 text-lg text-[#1a105c]">{teamData?.city}</dd>
                        </div>
                        <div className="mb-4">
                          <dt className="text-sm font-medium text-[#007487]">Conference</dt>
                          <dd className="mt-1 text-lg text-[#1a105c]">{teamData?.conference}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-[#007487]">Division</dt>
                          <dd className="mt-1 text-lg text-[#1a105c]">{teamData?.division}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg flex flex-col items-center justify-center">
                      <img 
                        src="/Charlotte_Hornets_(2014).webp" 
                        alt="Charlotte Hornets Logo" 
                        className="h-32 w-auto mb-4"
                      />
                      <p className="text-sm text-[#a5a5a5]">Charlotte Hornets</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Player Leaderboard */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-2xl font-bold text-[#1a105c] mb-6">Player Leaderboard</h2>
                {!loadingStates.statsLoaded ? (
                  <LoadingBar />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Points Per Game</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.average_points || '0') - parseFloat(a.average_points || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.average_points}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Rebounds Per Game</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.rebounds || '0') - parseFloat(a.rebounds || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.rebounds}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Assists Per Game</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.assists || '0') - parseFloat(a.assists || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.assists}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Field Goal %</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.field_goal_pct || '0') - parseFloat(a.field_goal_pct || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.field_goal_pct}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Three Point %</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.three_point_pct || '0') - parseFloat(a.three_point_pct || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.three_point_pct}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Minutes Per Game</h3>
                      <div className="space-y-2">
                        {players
                          .sort((a, b) => parseFloat(b.minutes || '0') - parseFloat(a.minutes || '0'))
                          .slice(0, 5)
                          .map((player, index) => (
                            <div key={player.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1a105c]">
                                {index + 1}. {player.first_name} {player.last_name}
                              </span>
                              <span className="text-sm text-[#007487]">{player.minutes}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shooting Efficiency Chart */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#1a105c]">Shooting Efficiency</h2>
                  <select
                    className="block rounded-md border-gray-300 shadow-sm focus:border-[#007487] focus:ring-[#007487] sm:text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'fg_pct' | 'three_pct')}
                  >
                    <option value="fg_pct">Sort by Field Goal %</option>
                    <option value="three_pct">Sort by 3-Point %</option>
                  </select>
                </div>
                {!loadingStates.statsLoaded ? (
                  <LoadingSpinner />
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={shootingData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#a5a5a5" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={100}
                          interval={0}
                          stroke="#1a105c"
                        />
                        <YAxis 
                          label={{ 
                            value: 'Percentage', 
                            angle: -90, 
                            position: 'insideLeft',
                            fill: '#1a105c'
                          }}
                          stroke="#1a105c"
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, '']}
                          labelFormatter={(label) => label}
                        />
                        <Legend />
                        <Bar 
                          dataKey="fg_pct" 
                          name="Field Goal %" 
                          fill="#1a105c" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="three_pct" 
                          name="3-Point %" 
                          fill="#007487" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Points Distribution Chart */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-2xl font-bold text-[#1a105c] mb-6">Points Distribution</h2>
                {!loadingStates.statsLoaded ? (
                  <LoadingSpinner />
                ) : (
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pointsData}
                        layout="vertical"
                        margin={{
                          top: 20,
                          right: 30,
                          left: 100,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#a5a5a5" />
                        <XAxis type="number" domain={[0, 30]} stroke="#1a105c" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tick={{ fontSize: 12 }}
                          stroke="#1a105c"
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} PPG`, '']}
                          labelFormatter={(label) => label}
                        />
                        <Bar 
                          dataKey="points" 
                          fill="#1a105c" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Radar Chart */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-2xl font-bold text-[#1a105c] mb-2">Player Performance Radar</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Shows how each player's statistics compare as a percentage of the team's best performance in each category. 
                  100% indicates the team leader in that category.
                </p>
                
                {/* Player Selection Dropdown */}
                <div className="mb-6">
                  <label htmlFor="player-select" className="block text-sm font-medium text-[#007487] mb-2">
                    Select Player
                  </label>
                  <select
                    id="player-select"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007487] focus:ring-[#007487] sm:text-sm"
                    value={selectedPlayer?.id || ''}
                    onChange={(e) => {
                      const player = players.find(p => p.id === parseInt(e.target.value));
                      setSelectedPlayer(player || null);
                    }}
                  >
                    <option value="">Select a player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Radar Chart */}
                {selectedPlayer && (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart 
                        cx="50%" 
                        cy="50%" 
                        outerRadius="80%" 
                        data={getRadarData(selectedPlayer, statDomains)}
                      >
                        <PolarGrid stroke="#a5a5a5" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          stroke="#1a105c"
                          tick={{ 
                            fill: '#1a105c',
                            fontSize: 12
                          }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          stroke="#1a105c"
                        />
                        <Radar
                          name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                          dataKey="value"
                          stroke="#1a105c"
                          fill="#1a105c"
                          fillOpacity={0.6}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${props.payload.actualValue} (${value}% of ${props.payload.maxValue})`,
                            props.payload.subject
                          ]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Players Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-2xl font-bold text-[#1a105c] mb-6">Players</h2>
                
                {!loadingStates.statsLoaded ? (
                  <LoadingSpinner />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#f8f9fa]">
                        <tr>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('first_name')}
                          >
                            Name {getSortIcon('first_name')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('position')}
                          >
                            Position {getSortIcon('position')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('games_played')}
                          >
                            GP {getSortIcon('games_played')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('minutes')}
                          >
                            Min {getSortIcon('minutes')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('average_points')}
                          >
                            Pts {getSortIcon('average_points')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('rebounds')}
                          >
                            Reb {getSortIcon('rebounds')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('assists')}
                          >
                            Ast {getSortIcon('assists')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('steals')}
                          >
                            Stl {getSortIcon('steals')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('blocks')}
                          >
                            Blk {getSortIcon('blocks')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('turnovers')}
                          >
                            TOV {getSortIcon('turnovers')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('personal_fouls')}
                          >
                            PF {getSortIcon('personal_fouls')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('field_goal_pct')}
                          >
                            FG% {getSortIcon('field_goal_pct')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('three_point_pct')}
                          >
                            3P% {getSortIcon('three_point_pct')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('free_throw_pct')}
                          >
                            FT% {getSortIcon('free_throw_pct')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('jersey_number')}
                          >
                            Jersey {getSortIcon('jersey_number')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('height')}
                          >
                            Height {getSortIcon('height')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('weight')}
                          >
                            Weight {getSortIcon('weight')}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider cursor-pointer hover:bg-[#e9ecef]"
                            onClick={() => sortPlayers('college')}
                          >
                            College {getSortIcon('college')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getSortedPlayers().map((player) => (
                          <tr key={player.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div 
                                className="text-sm font-medium text-[#1a105c] cursor-pointer hover:text-[#007487] underline"
                                onClick={() => handleGameLogClick(player.id)}
                              >
                                {player.first_name} {player.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.position}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.games_played}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.minutes}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.average_points}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.rebounds}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.assists}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.steals}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.blocks}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.turnovers}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.personal_fouls}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.field_goal_pct}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.three_point_pct}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.free_throw_pct}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.jersey_number}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.height}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.weight}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#007487]">{player.college}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Add this test section */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-2xl font-bold text-[#1a105c] mb-6">Player Comparison Test</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#007487] mb-2">
                    Select Two Players to Compare
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (selectedPlayers.includes(player.id)) {
                            setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                          } else if (selectedPlayers.length < 2) {
                            setSelectedPlayers([...selectedPlayers, player.id]);
                          }
                        }}
                        className={`px-3 py-1 rounded ${
                          selectedPlayers.includes(player.id)
                            ? selectedPlayers.indexOf(player.id) === 0
                              ? 'bg-[#1a105c] text-white'
                              : 'bg-[#007487] text-white'
                            : 'bg-[#f8f9fa] text-[#1a105c]'
                        } ${selectedPlayers.length === 2 && !selectedPlayers.includes(player.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={selectedPlayers.length === 2 && !selectedPlayers.includes(player.id)}
                      >
                        {player.first_name} {player.last_name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={testComparison}
                  disabled={selectedPlayers.length !== 2 || comparisonLoading}
                  className={`px-4 py-2 rounded ${
                    selectedPlayers.length !== 2 || comparisonLoading
                      ? 'bg-[#a5a5a5] cursor-not-allowed'
                      : 'bg-[#007487] hover:bg-[#005f6b]'
                  } text-white`}
                >
                  {comparisonLoading ? 'Comparing...' : 'Compare Selected Players'}
                </button>

                {comparisonError && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
                    {comparisonError}
                  </div>
                )}

                {comparisonData && comparisonData.players && comparisonData.players.length === 2 && (
                  <div className="mt-6 space-y-8">
                    <div>
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Player Comparison - Game Stats</h3>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={prepareCountingStatsTornadoData(comparisonData.players)}
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#a5a5a5" />
                            <XAxis 
                              type="number"
                              label={{ 
                                value: 'Per Game Average', 
                                position: 'insideBottom', 
                                offset: -5 
                              }}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="stat" 
                              width={80}
                            />
                            <Tooltip 
                              formatter={(value: number, name: string) => [`${value.toFixed(1)} per game`, name]}
                            />
                            <Legend />
                            {comparisonData.players.map((player, index) => (
                              <Bar
                                key={player.name}
                                dataKey={player.name}
                                fill={`${index === 0 ? '#1a105c' : '#007487'}`}
                                fillOpacity={0.8}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-[#1a105c] mb-4">Player Comparison - Shooting Percentages</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={prepareShootingStatsTornadoData(comparisonData.players)}
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#a5a5a5" />
                            <XAxis 
                              type="number" 
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              label={{ 
                                value: 'Percentage', 
                                position: 'insideBottom', 
                                offset: -5 
                              }}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="stat" 
                              width={80}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                            />
                            <Legend />
                            {comparisonData.players.map((player, index) => (
                              <Bar
                                key={player.name}
                                dataKey={player.name}
                                fill={`${index === 0 ? '#1a105c' : '#007487'}`}
                                fillOpacity={0.8}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-600">
                      <p>* Purple bars represent {comparisonData.players[0].name}</p>
                      <p>* Teal bars represent {comparisonData.players[1].name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Game Log Section */}
            {gameLogPlayer && (
              <div ref={gameLogRef} className="mt-8 bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#1a105c]">
                      Game Log - {gameLogPlayer.first_name} {gameLogPlayer.last_name}
                    </h2>
                    <button
                      onClick={() => {
                        setGameLogPlayer(null);
                        setGameLogData([]);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                      aria-label="Close game log"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#f8f9fa]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Team</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Min</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Pts</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Reb</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Ast</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Stl</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">Blk</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">TO</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">FG%</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">3P%</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#007487] uppercase tracking-wider">FT%</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {gameLogData.map((game) => (
                          <tr key={game.game.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1a105c]">
                              {new Date(game.game.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">
                              {game.team.abbreviation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.min}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.pts}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.reb}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.ast}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.stl}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.blk}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">{game.turnover}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">
                              {(game.fg_pct * 100).toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">
                              {(game.fg3_pct * 100).toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#007487]">
                              {(game.ft_pct * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
