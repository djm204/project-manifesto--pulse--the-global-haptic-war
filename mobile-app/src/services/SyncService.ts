import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { ApiService } from './ApiService';
import { SecurityService } from './SecurityService';

export interface PulseEvent {
  id: string;
  scheduledTime: Date;
  duration: number;
  intensity: number;
  globalParticipants: number;
}

export interface SyncStatus {
  isConnected: boolean;
  latency: number;
  ntpOffset: number;
  lastSync: Date;
}

export class SyncService extends EventEmitter {
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private latency: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isConnected: boolean = false;
  private apiService: ApiService;
  private securityService: SecurityService;

  constructor() {
    super();
    this.apiService = new ApiService();
    this.securityService = new SecurityService();
  }

  async initialize(): Promise<void> {
    try {
      await this.connectToSyncServer();
      await this.synchronizeGlobalTime();
      this.startSyncInterval();
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize SyncService:', error);
      throw new Error('SyncService initialization failed');
    }
  }

  private async connectToSyncServer(): Promise<void> {
    const token = await this.securityService.getAuthToken();
    
    this.socket = io(process.env.SYNC_SERVER_URL || 'ws://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.isConnected = false;
        this.emit('connection_error', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.emit('disconnected');
      });
    });
  }

  async synchronizeGlobalTime(): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('time_sync_request', { clientTime: startTime });
      
      this.socket!.once('time_sync_response', (data: { serverTime: number, clientTime: number }) => {
        const endTime = Date.now();
        const roundTripTime = endTime - startTime;
        this.latency = roundTripTime / 2;
        
        const serverTime = data.serverTime + this.latency;
        this.ntpOffset = serverTime - endTime;
        
        this.emit('time_synced', { offset: this.ntpOffset, latency: this.latency });
        resolve();
      });

      setTimeout(() => {
        reject(new Error('Time sync timeout'));
      }, 10000);
    });
  }

  getGlobalTime(): Date {
    return new Date(Date.now() + this.ntpOffset);
  }

  async schedulePulseEvent(eventTime: Date): Promise<string> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to sync server');
    }

    const eventId = this.generateEventId();
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('schedule_pulse', {
        eventId,
        scheduledTime: eventTime.getTime(),
        clientOffset: this.ntpOffset
      });

      this.socket!.once(`pulse_scheduled_${eventId}`, (response) => {
        if (response.success) {
          resolve(eventId);
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => {
        reject(new Error('Pulse scheduling timeout'));
      }, 5000);
    });
  }

  onPulseStart(callback: (event: PulseEvent) => void): void {
    this.on('pulse_start', callback);
  }

  onPulseEnd(callback: (eventId: string) => void): void {
    this.on('pulse_end', callback);
  }

  getSyncStatus(): SyncStatus {
    return {
      isConnected: this.isConnected,
      latency: this.latency,
      ntpOffset: this.ntpOffset,
      lastSync: new Date()
    };
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('pulse_start', (event: PulseEvent) => {
      this.emit('pulse_start', event);
    });

    this.socket.on('pulse_end', (eventId: string) => {
      this.emit('pulse_end', eventId);
    });

    this.socket.on('global_stats', (stats) => {
      this.emit('global_stats', stats);
    });
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.synchronizeGlobalTime();
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, 30000); // Sync every 30 seconds
  }

  private generateEventId(): string {
    return `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async disconnect(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.removeAllListeners();
  }
}