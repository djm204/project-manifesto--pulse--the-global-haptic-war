export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  country: string;
  timezone: string;
  level: number;
  experience: number;
  coins: number;
  premiumCurrency: number;
  settings: UserSettings;
  statistics: UserStatistics;
  createdAt: number;
  lastActiveAt: number;
}

export interface UserSettings {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  privacyMode: boolean;
  language: string;
  theme: Theme;
}

export interface UserStatistics {
  totalPulses: number;
  averageAccuracy: number;
  bestRank: number;
  bestPercentile: number;
  streakCurrent: number;
  streakBest: number;
  totalRewards: number;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  country: string;
  timezone: string;
}