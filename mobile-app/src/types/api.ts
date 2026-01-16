export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface AuthRequest {
  deviceId: string;
  platform: 'ios' | 'android';
  version: string;
  timezone: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  userId: string;
  expiresIn: number;
}

export interface SyncRequest {
  userId: string;
  timestamp: number;
  timezone: string;
}

export interface SyncResponse {
  serverTime: number;
  nextPulse: number;
  region: string;
  latency: number;
}

export interface PulseSubmission {
  sessionId: string;
  timestamp: number;
  accuracy: number;
  deviceLatency: number;
}

export interface LeaderboardRequest {
  type: 'global' | 'regional' | 'friends';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime';
  limit?: number;
  offset?: number;
}