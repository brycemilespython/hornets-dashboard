import { NextResponse } from 'next/server';
import axios from 'axios';

// TypeScript interfaces
interface PlayerStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  field_goal_pct: number;
  three_point_pct: number;
  free_throw_pct: number;
  minutes: number;
  games_played: number;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  stats: {
    [key: string]: {
      value: number;
      rank: number;
      percentile: number;
    };
  };
}

interface ComparisonResponse {
  players: Player[];
  comparisons: {
    [key: string]: {
      leader: number;
      difference: number;
    };
  };
}

// Helper function to calculate advanced stats
const calculateAdvancedStats = (stats: PlayerStats) => {
  const per = (stats.points + stats.rebounds + stats.assists + stats.steals + stats.blocks) / stats.games_played;
  const trueShooting = stats.points / (2 * (stats.field_goal_pct + 0.44 * stats.free_throw_pct));
  const usageRate = (stats.points + stats.assists) / (stats.minutes * stats.games_played);

  return {
    per,
    trueShooting,
    usageRate,
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('playerIds')?.split(',').map(Number) || [];
    const metrics = searchParams.get('metrics')?.split(',') || [
      'points',
      'rebounds',
      'assists',
      'steals',
      'blocks',
      'field_goal_pct',
      'three_point_pct',
      'free_throw_pct',
      'minutes',
    ];
    const season = searchParams.get('season') || '2024';

    if (!playerIds.length) {
      return NextResponse.json(
        { error: 'No player IDs provided' },
        { status: 400 }
      );
    }

    // Fetch player data from balldontlie API
    const playersResponse = await axios.get('https://api.balldontlie.io/v1/players', {
      params: {
        ids: playerIds,
      },
      headers: {
        'Authorization': 'b6dc962d-e53f-4659-a379-ec939aa673b9',
      },
    });

    if (!playersResponse.data.data || playersResponse.data.data.length === 0) {
      return NextResponse.json(
        { error: 'No players found with the provided IDs' },
        { status: 404 }
      );
    }

    // Fetch stats for each player
    const statsPromises = playerIds.map(async (playerId) => {
      const statsResponse = await axios.get('https://api.balldontlie.io/v1/stats', {
        params: {
          player_ids: [playerId],
          seasons: [season],
          per_page: 100,
        },
        headers: {
          'Authorization': 'b6dc962d-e53f-4659-a379-ec939aa673b9',
        },
      });

      if (!statsResponse.data.data) {
        throw new Error(`No stats found for player ${playerId}`);
      }

      return {
        playerId,
        stats: statsResponse.data.data,
      };
    });

    const statsResults = await Promise.all(statsPromises);

    // Process and aggregate stats
    const processedPlayers = statsResults.map(({ playerId, stats }) => {
      const player = playersResponse.data.data.find((p: any) => p.id === playerId);
      const totalGames = stats.length;
      
      const aggregatedStats = {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        field_goal_pct: 0,
        three_point_pct: 0,
        free_throw_pct: 0,
        minutes: 0,
        games_played: totalGames,
      };

      stats.forEach((game: any) => {
        aggregatedStats.points += game.pts;
        aggregatedStats.rebounds += game.reb;
        aggregatedStats.assists += game.ast;
        aggregatedStats.steals += game.stl;
        aggregatedStats.blocks += game.blk;
        aggregatedStats.field_goal_pct += game.fg_pct;
        aggregatedStats.three_point_pct += game.fg3_pct;
        aggregatedStats.free_throw_pct += game.ft_pct;
        aggregatedStats.minutes += parseFloat(game.min);
      });

      // Calculate averages
      Object.keys(aggregatedStats).forEach((key) => {
        if (key !== 'games_played') {
          aggregatedStats[key as keyof typeof aggregatedStats] /= totalGames;
        }
      });

      const advancedStats = calculateAdvancedStats(aggregatedStats);

      return {
        id: playerId,
        name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        stats: {
          ...aggregatedStats,
          ...advancedStats,
        },
      };
    });

    // Calculate rankings and percentiles
    const allPlayers = processedPlayers.map((player) => ({
      ...player,
      stats: Object.fromEntries(
        Object.entries(player.stats).map(([metric, value]) => [
          metric,
          {
            value,
            rank: 0,
            percentile: 0,
          },
        ])
      ),
    }));

    // Calculate rankings for each metric
    metrics.forEach((metric) => {
      const sortedPlayers = [...allPlayers].sort(
        (a, b) => b.stats[metric].value - a.stats[metric].value
      );

      sortedPlayers.forEach((player, index) => {
        player.stats[metric].rank = index + 1;
        player.stats[metric].percentile = ((allPlayers.length - index) / allPlayers.length) * 100;
      });
    });

    // Calculate comparisons
    const comparisons = metrics.reduce((acc, metric) => {
      const sorted = [...allPlayers].sort(
        (a, b) => b.stats[metric].value - a.stats[metric].value
      );
      acc[metric] = {
        leader: sorted[0].id,
        difference: sorted[0].stats[metric].value - sorted[sorted.length - 1].stats[metric].value,
      };
      return acc;
    }, {} as { [key: string]: { leader: number; difference: number } });

    return NextResponse.json({
      players: allPlayers,
      comparisons,
    });
  } catch (error) {
    console.error('Error in player comparison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player comparison data' },
      { status: 500 }
    );
  }
} 