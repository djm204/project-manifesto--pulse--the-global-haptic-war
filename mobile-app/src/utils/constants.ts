export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  PULSE: '/api/pulse',
  LEADERBOARD: '/api/leaderboard',
  ADS: '/api/ads',
  ANALYTICS: '/api/analytics'
} as const;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  PULSE_START: 'pulse:start',
  PULSE_END: 'pulse:end',
  SYNC_TIME: 'sync:time',
  RANK_UPDATE: 'rank:update'
} as const;

export const AD_PLACEMENTS = {
  POST_PULSE: 'post_pulse',
  LEVEL_UP: 'level_up',
  DAILY_REWARD: 'daily_reward',
  STORE: 'store'
} as const;

export const HAPTIC_PATTERNS = {
  TAP: {
    type: 'tap' as const,
    intensity: 0.8,
    duration: 100,
    sequence: [
      { delay: 0, intensity: 0.8, duration: 100, type: 'impact' as const }
    ]
  },
  SWIRL: {
    type: 'swirl' as const,
    intensity: 0.6,
    duration: 500,
    sequence: [
      { delay: 0, intensity: 0.6, duration: 100, type: 'selection' as const },
      { delay: 100, intensity: 0.4, duration: 100, type: 'selection' as const },
      { delay: 200, intensity: 0.6, duration: 100, type: 'selection' as const },
      { delay: 300, intensity: 0.4, duration: 100, type: 'selection' as const },
      { delay: 400, intensity: 0.8, duration: 100, type: 'impact' as const }
    ]
  },
  SHATTER: {
    type: 'shatter' as const,
    intensity: 1.0,
    duration: 300,
    sequence: [
      { delay: 0, intensity: 1.0, duration: 50, type: 'impact' as const },
      { delay: 50, intensity: 0.8, duration: 50, type: 'impact' as const },
      { delay: 100, intensity: 0.6, duration: 50, type: 'impact' as const },
      { delay: 150, intensity: 0.4, duration: 50, type: 'impact' as const },
      { delay: 200, intensity: 0.2, duration: 50, type: 'impact' as const },
      { delay: 250, intensity: 0.1, duration: 50, type: 'selection' as const }
    ]
  }
} as const;

export const SECURITY_CONFIG = {
  JWT_EXPIRY: 3600000, // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800000, // 7 days
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000, // 15 minutes
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  HASH_ROUNDS: 12
} as const;

export const PERFORMANCE_THRESHOLDS = {
  MAX_SYNC_DRIFT: 50, // milliseconds
  MIN_ACCURACY: 0.7, // 70%
  MAX_RESPONSE_TIME: 200, // milliseconds
  TARGET_FPS: 60
} as const;