export type LeaderboardType = 'global' | 'regional' | 'friends';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  region?: string;
  avatar?: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: number;
  totalUsers: number;
  lastUpdated: string;
}

export interface LeaderboardRequest {
  type: LeaderboardType;
  limit?: number;
  offset?: number;
  region?: string;
}