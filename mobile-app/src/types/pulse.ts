export interface PulseEvent {
  id: string;
  timestamp: number;
  userId: string;
  accuracy: number;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  timezone: string;
}

export interface SyncState {
  isConnected: boolean;
  latency: number;
  serverTime: number;
  localOffset: number;
  region: string;
}

export interface HapticPattern {
  name: 'tap' | 'swirl' | 'shatter' | 'custom';
  pattern: number[];
  intensity: number;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime: number;
  participants: number;
  region: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  experience: number;
  achievements: Achievement[];
  stats: UserStats;
  preferences: UserPreferences;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

export interface UserStats {
  totalPulses: number;
  averageAccuracy: number;
  bestStreak: number;
  globalRank: number;
  regionalRank: number;
  sessionsPlayed: number;
}

export interface UserPreferences {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  dataCollection: boolean;
  adPersonalization: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  rank: number;
  country?: string;
}