export interface PulseEvent {
  id: string;
  timestamp: number;
  countdownDuration: number;
  hapticPattern: HapticPattern;
  globalParticipants: number;
  status: PulseStatus;
}

export interface PulseResult {
  id: string;
  userId: string;
  eventId: string;
  accuracy: number;
  reactionTime: number;
  rank: number;
  percentile: number;
  rewards: PulseReward[];
  timestamp: number;
}

export interface PulseReward {
  type: RewardType;
  amount: number;
  currency: string;
  description: string;
}

export enum HapticPattern {
  TAP = 'tap',
  SWIRL = 'swirl',
  SHATTER = 'shatter'
}

export enum PulseStatus {
  SCHEDULED = 'scheduled',
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export enum RewardType {
  COINS = 'coins',
  EXPERIENCE = 'experience',
  PREMIUM_CURRENCY = 'premium_currency'
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  score: number;
  percentile: number;
  country: string;
  avatar?: string;
}

export interface Leaderboard {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  userRank?: number;
  totalParticipants: number;
  lastUpdated: number;
}

export enum LeaderboardType {
  GLOBAL = 'global',
  LOCAL = 'local',
  FRIENDS = 'friends'
}