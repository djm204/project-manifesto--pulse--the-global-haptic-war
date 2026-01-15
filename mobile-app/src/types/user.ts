export interface User {
  id: string;
  deviceId: string;
  isAnonymous: boolean;
  createdAt: number;
  lastActive: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  hapticIntensity: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  privacyLevel: 'minimal' | 'standard' | 'full';
}

export interface UserStats {
  totalPulses: number;
  bestAccuracy: number;
  currentStreak: number;
  bestRank: number;
  averageScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  accuracy: number;
  streak: number;
}