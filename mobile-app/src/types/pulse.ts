export interface PulseEvent {
  id: string;
  timestamp: number;
  intensity: number;
  pattern: HapticPattern;
  globalSync: boolean;
}

export interface SyncData {
  serverTime: number;
  nextPulse: number;
  latency: number;
  offset: number;
}

export enum HapticPattern {
  TAP = 'tap',
  SWIRL = 'swirl',
  SHATTER = 'shatter'
}

export interface PulseResult {
  userId: string;
  accuracy: number;
  timing: number;
  score: number;
  rank?: number;
}

export interface GlobalState {
  isActive: boolean;
  participants: number;
  nextPulse: number;
  currentRound: number;
}