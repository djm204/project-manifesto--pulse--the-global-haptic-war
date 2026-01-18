import { SecurityService } from './SecurityService';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  country?: string;
  timestamp: number;
}

export interface LeaderboardFilter {
  type: 'global' | 'local' | 'friends';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime';
  region?: string;
}

export class LeaderboardService {
  private securityService: SecurityService;
  private baseUrl: string;
  private cache: Map<string, { data: LeaderboardEntry[]; expiry: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(baseUrl: string, securityService: SecurityService) {
    this.baseUrl = baseUrl;
    this.securityService = securityService;
  }

  async getLeaderboard(filter: LeaderboardFilter, limit = 100): Promise<LeaderboardEntry[]> {
    const cacheKey = this.getCacheKey(filter, limit);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const token = await this.securityService.getAuthToken();
      const response = await fetch(`${this.baseUrl}/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ filter, limit }),
      });

      if (!response.ok) {
        throw new Error(`Leaderboard request failed: ${response.status}`);
      }

      const data = await response.json();
      const leaderboard = this.validateLeaderboardData(data.leaderboard);

      // Cache the result
      this.cache.set(cacheKey, {
        data: leaderboard,
        expiry: Date.now() + this.CACHE_DURATION
      });

      return leaderboard;
    } catch (error) {
      throw new Error(`Failed to fetch leaderboard: ${error}`);
    }
  }

  async getUserRank(userId: string, filter: LeaderboardFilter): Promise<number> {
    try {
      const token = await this.securityService.getAuthToken();
      const response = await fetch(`${this.baseUrl}/leaderboard/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, filter }),
      });

      if (!response.ok) {
        throw new Error(`Rank request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.rank;
    } catch (error) {
      throw new Error(`Failed to fetch user rank: ${error}`);
    }
  }

  async submitScore(score: number, metadata?: any): Promise<boolean> {
    try {
      const token = await this.securityService.getAuthToken();
      const encryptedScore = await this.securityService.encryptData(JSON.stringify({
        score,
        timestamp: Date.now(),
        metadata
      }));

      const response = await fetch(`${this.baseUrl}/leaderboard/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ encryptedScore }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to submit score:', error);
      return false;
    }
  }

  private validateLeaderboardData(data: any[]): LeaderboardEntry[] {
    return data.map((entry, index) => ({
      userId: entry.userId || '',
      username: entry.username || `Player ${index + 1}`,
      score: typeof entry.score === 'number' ? entry.score : 0,
      rank: typeof entry.rank === 'number' ? entry.rank : index + 1,
      country: entry.country,
      timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now()
    }));
  }

  private getCacheKey(filter: LeaderboardFilter, limit: number): string {
    return `${filter.type}_${filter.timeframe}_${filter.region || 'global'}_${limit}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}