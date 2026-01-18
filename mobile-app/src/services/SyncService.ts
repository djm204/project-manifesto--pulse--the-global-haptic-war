import { io, Socket } from 'socket.io-client';
import { ApiService } from './ApiService';
import { SecurityService } from './SecurityService';
import { PulseSession, SyncStatus } from '../types/pulse';
import { validateUserId } from '../utils/validation';

export class SyncService {
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private syncStatus: SyncStatus = 'disconnected';
  private readonly apiService: ApiService;
  private readonly securityService: SecurityService;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  constructor(
    apiService: ApiService,
    securityService: SecurityService
  ) {
    this.apiService = apiService;
    this.securityService = securityService;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await this.securityService.getAuthToken();
    if (!token) throw new Error('Authentication required');

    this.socket = io(process.env.WEBSOCKET_URL!, {
      auth: { token },
      transports: ['websocket'],
      timeout: 10000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.syncStatus = 'connected';
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      this.syncStatus = 'disconnected';
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.syncStatus = 'error';
    });
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.syncStatus = 'failed';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  async synchronizeTime(): Promise<void> {
    try {
      const start = Date.now();
      const serverTime = await this.apiService.getServerTime();
      const end = Date.now();
      const networkDelay = (end - start) / 2;
      
      this.ntpOffset = serverTime - (start + networkDelay);
      this.syncStatus = 'synchronized';
    } catch (error) {
      console.error('Time synchronization failed:', error);
      throw new Error('Failed to synchronize time');
    }
  }

  async joinGlobalPulse(userId: string): Promise<PulseSession> {
    validateUserId(userId);
    
    if (!this.socket?.connected) {
      await this.connect();
    }

    await this.synchronizeTime();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pulse join timeout'));
      }, 15000);

      this.socket!.emit('join-pulse', { 
        userId: this.securityService.sanitizeUserId(userId),
        timestamp: this.getSynchronizedTime()
      });

      this.socket!.once('pulse-session', (session: PulseSession) => {
        clearTimeout(timeout);
        resolve(session);
      });

      this.socket!.once('pulse-error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  getSynchronizedTime(): number {
    return Date.now() + this.ntpOffset;
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.syncStatus = 'disconnected';
    }
  }
}