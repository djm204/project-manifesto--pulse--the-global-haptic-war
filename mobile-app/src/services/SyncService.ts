import { io, Socket } from 'socket.io-client';
import { HapticService } from './HapticService';
import { SecurityService } from './SecurityService';
import { API_BASE_URL } from '../utils/constants';

export interface PulseEvent {
  id: string;
  timestamp: number;
  participants: number;
  type: 'global' | 'regional';
}

export class SyncService {
  private static instance: SyncService;
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async connect(): Promise<void> {
    try {
      const token = await SecurityService.getSecureToken();
      
      this.socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupSocketListeners();
      await this.synchronizeWithServer();
    } catch (error) {
      console.error('Failed to connect to sync service:', error);
      throw new Error('Sync service connection failed');
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to sync service');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from sync service');
    });

    this.socket.on('pulse_event', (event: PulseEvent) => {
      this.handlePulseEvent(event);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`Connection error (attempt ${this.reconnectAttempts}):`, error);
    });
  }

  async synchronizeWithServer(): Promise<void> {
    try {
      const clientTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/time`);
      const { serverTime } = await response.json();
      
      this.ntpOffset = serverTime - clientTime;
      console.log(`Time synchronized. Offset: ${this.ntpOffset}ms`);
    } catch (error) {
      console.error('Time synchronization failed:', error);
      throw new Error('Time synchronization failed');
    }
  }

  getGlobalTime(): number {
    return Date.now() + this.ntpOffset;
  }

  scheduleGlobalPulse(timestamp: number): void {
    const delay = timestamp - this.getGlobalTime();
    
    if (delay <= 0) {
      this.triggerPulse();
      return;
    }

    setTimeout(() => {
      this.triggerPulse();
    }, delay);
  }

  private triggerPulse(): void {
    HapticService.triggerPulse();
    this.emitPulseEvent();
  }

  private emitPulseEvent(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('user_pulse', {
        timestamp: this.getGlobalTime(),
        userId: SecurityService.getUserId()
      });
    }
  }

  private handlePulseEvent(event: PulseEvent): void {
    this.scheduleGlobalPulse(event.timestamp);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}