import { io, Socket } from 'socket.io-client';
import { SecurityService } from './SecurityService';
import { SYNC_CONFIG } from '../utils/constants';
import { PulseEvent } from '../types/pulse';

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}

export class SyncService {
  private static instance: SyncService;
  private socket: Socket | null = null;
  private securityService: SecurityService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, (data: any) => void> = new Map();

  private constructor() {
    this.securityService = SecurityService.getInstance();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async connectToGlobalSync(): Promise<void> {
    const token = await this.securityService.getValidatedToken();
    if (!token) {
      throw new SyncError('Authentication required for sync');
    }

    this.socket = io(SYNC_CONFIG.SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      timeout: SYNC_CONFIG.CONNECTION_TIMEOUT,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to sync server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from sync server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('pulse_event', (data: PulseEvent) => {
      this.handlePulseEvent(data);
    });

    this.socket.on('sync_time', (serverTime: number) => {
      this.synchronizeTime(serverTime);
    });
  }

  private handlePulseEvent(event: PulseEvent): void {
    const listener = this.listeners.get('pulse_event');
    if (listener) {
      listener(event);
    }
  }

  private synchronizeTime(serverTime: number): void {
    const clientTime = Date.now();
    const timeDiff = serverTime - clientTime;
    
    // Store time offset for future synchronization
    this.storeTimeOffset(timeDiff);
  }

  private async storeTimeOffset(offset: number): Promise<void> {
    // Store time offset securely for sync calculations
    // Implementation depends on storage strategy
  }

  addEventListener(event: string, callback: (data: any) => void): void {
    this.listeners.set(event, callback);
  }

  removeEventListener(event: string): void {
    this.listeners.delete(event);
  }

  async sendPulseAction(action: any): Promise<void> {
    if (!this.socket?.connected) {
      throw new SyncError('Not connected to sync server');
    }

    this.socket.emit('pulse_action', action);
  }

  async requestTimeSync(): Promise<void> {
    if (!this.socket?.connected) {
      throw new SyncError('Not connected to sync server');
    }

    this.socket.emit('request_time_sync');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getServerLatency(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new SyncError('Not connected to sync server'));
        return;
      }

      const startTime = Date.now();
      this.socket.emit('ping', startTime, (serverTime: number) => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });
    });
  }
}