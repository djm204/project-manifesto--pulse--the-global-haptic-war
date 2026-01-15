import { io, Socket } from 'socket.io-client';
import { PULSE_CONFIG, API_ENDPOINTS } from '../utils/constants';
import { PulseEvent, SyncResult, NTPResult } from '../types/pulse';
import { SecurityService } from './SecurityService';
import { PrivacyService } from './PrivacyService';

export class SyncService {
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private securityService: SecurityService;
  private privacyService: PrivacyService;

  constructor() {
    this.securityService = new SecurityService();
    this.privacyService = new PrivacyService();
  }

  async initialize(): Promise<void> {
    try {
      await this.calculateNTPOffset();
      await this.establishConnection();
    } catch (error) {
      console.error('SyncService initialization failed:', error);
      throw error;
    }
  }

  async synchronizeGlobalPulse(): Promise<PulseEvent> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to sync server');
    }

    const hasConsent = await this.privacyService.hasValidConsent('pulse_sync');
    if (!hasConsent) {
      throw new Error('User consent required for pulse synchronization');
    }

    const syncTime = Date.now() + this.ntpOffset;
    const encryptedPayload = await this.securityService.encryptData({
      timestamp: syncTime,
      deviceId: await this.securityService.getDeviceId(),
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pulse synchronization timeout'));
      }, PULSE_CONFIG.SYNC_TIMEOUT);

      this.socket!.emit('pulse_sync_request', encryptedPayload, (response: any) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve({
            id: response.pulseId,
            timestamp: response.timestamp,
            participants: response.participants,
            globalSync: true,
          });
        } else {
          reject(new Error(response.error || 'Sync failed'));
        }
      });
    });
  }

  private async calculateNTPOffset(): Promise<void> {
    const ntpServers = [
      'time.google.com',
      'time.cloudflare.com',
      'pool.ntp.org',
    ];

    const offsets: number[] = [];

    for (const server of ntpServers) {
      try {
        const result = await this.queryNTPServer(server);
        offsets.push(result.offset);
      } catch (error) {
        console.warn(`NTP query failed for ${server}:`, error);
      }
    }

    if (offsets.length === 0) {
      throw new Error('All NTP servers failed');
    }

    // Use median offset for better accuracy
    offsets.sort((a, b) => a - b);
    this.ntpOffset = offsets[Math.floor(offsets.length / 2)];
  }

  private async queryNTPServer(server: string): Promise<NTPResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`https://${server}/time`, {
        method: 'GET',
        timeout: 3000,
      });
      
      const endTime = Date.now();
      const serverTime = new Date(response.headers.get('date') || '').getTime();
      const networkDelay = (endTime - startTime) / 2;
      const offset = serverTime - startTime - networkDelay;

      return {
        server,
        offset,
        delay: networkDelay,
        timestamp: serverTime,
      };
    } catch (error) {
      throw new Error(`NTP query failed: ${error}`);
    }
  }

  private async establishConnection(): Promise<void> {
    const token = await this.securityService.getAuthToken();
    
    this.socket = io(API_ENDPOINTS.WEBSOCKET, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to sync server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from sync server');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to sync server');
      this.isConnected = false;
    });

    this.socket.on('pulse_broadcast', async (encryptedData: string) => {
      try {
        const data = await this.securityService.decryptData(encryptedData);
        // Handle incoming pulse broadcast
        this.handlePulseBroadcast(data);
      } catch (error) {
        console.error('Failed to handle pulse broadcast:', error);
      }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket!.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private handlePulseBroadcast(data: any): void {
    // Emit to Redux store or handle pulse broadcast
    console.log('Received pulse broadcast:', data);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const syncService = new SyncService();