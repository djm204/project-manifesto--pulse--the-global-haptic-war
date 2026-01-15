import { io, Socket } from 'socket.io-client';
import { SYNC_CONFIG } from '../utils/constants';
import { PulseEvent, SyncStatus } from '../types/pulse';

export class SyncService {
  private static instance: SyncService;
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private syncStatus: SyncStatus = 'disconnected';
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
      this.socket = io(SYNC_CONFIG.SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: SYNC_CONFIG.CONNECTION_TIMEOUT,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      await this.setupEventHandlers();
      await this.performTimeSync();
      this.syncStatus = 'connected';
    } catch (error) {
      console.error('Failed to connect to sync service:', error);
      this.syncStatus = 'error';
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.syncStatus = 'disconnected';
    }
  }

  async performTimeSync(): Promise<void> {
    try {
      const startTime = Date.now();
      
      if (!this.socket) {
        throw new Error('Socket not connected');
      }

      const serverTime = await new Promise<number>((resolve, reject) => {
        this.socket!.emit('time_sync_request', startTime);
        this.socket!.once('time_sync_response', (data) => {
          resolve(data.serverTime);
        });
        
        setTimeout(() => reject(new Error('Time sync timeout')), 5000);
      });

      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      this.ntpOffset = serverTime - startTime - (roundTripTime / 2);
      
      console.log(`Time sync completed. Offset: ${this.ntpOffset}ms`);
    } catch (error) {
      console.error('Time sync failed:', error);
      throw error;
    }
  }

  getSynchronizedTime(): number {
    return Date.now() + this.ntpOffset;
  }

  joinPulseEvent(eventId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join_pulse', { eventId });
      this.socket.once('pulse_joined', () => resolve());
      this.socket.once('join_error', (error) => reject(error));
    });
  }

  submitPulseResult(eventId: string, result: any): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const timestamp = this.getSynchronizedTime();
    this.socket.emit('pulse_result', {
      eventId,
      result,
      timestamp,
      clientTime: Date.now()
    });
  }

  onPulseEvent(callback: (event: PulseEvent) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('pulse_event', callback);
  }

  onLeaderboardUpdate(callback: (data: any) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('leaderboard_update', callback);
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  private async setupEventHandlers(): Promise<void> {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to sync service');
      this.syncStatus = 'connected';
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from sync service');
      this.syncStatus = 'disconnected';
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.syncStatus = 'error';
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.syncStatus = 'failed';
      }
    });

    this.socket.on('reconnect', () => {
      console.log('Reconnected to sync service');
      this.performTimeSync().catch(console.error);
    });
  }
}