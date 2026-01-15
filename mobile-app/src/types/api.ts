export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface WebSocketMessage {
  type: MessageType;
  data: any;
  timestamp: number;
  id?: string;
}

export enum MessageType {
  PULSE_COUNTDOWN = 'pulse_countdown',
  PULSE_START = 'pulse_start',
  PULSE_END = 'pulse_end',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  SYNC_TIME = 'sync_time',
  ERROR = 'error'
}

export interface SyncTimeData {
  serverTime: number;
  clientTime: number;
  latency: number;
}

export interface PulseCountdownData {
  eventId: string;
  timeRemaining: number;
  hapticPattern: string;
  participants: number;
}