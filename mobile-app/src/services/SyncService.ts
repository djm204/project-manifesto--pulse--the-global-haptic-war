import { Socket, io } from 'socket.io-client';
import { EventEmitter } from 'events';
import { PulseEvent, SyncStatus, NTPResponse } from '../types/pulse';
import { SecurityService } from './SecurityService';
import { validateInput } from '../utils/validation';

export class SyncService extends EventEmitter {
  private socket: Socket | null = null;
  private ntpOffset: number = 0;
  private syncStatus: SyncStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private securityService: SecurityService;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.securityService = new SecurityService();
  }

  async initialize(): Promise<void> {
    try {
      const serverUrl = process.env.REACT_APP_PULSE_SERVER_URL;
      if (!serverUrl) {
        throw new Error('PULSE_SERVER_URL not configured');
      }

      validateInput(serverUrl, 'url');
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        secure: true,
        timeout: 5000,
        forceNew: true
      });

      this.setupSocketListeners();
      await this.synchronizeWithGlobalClock();
      this.startHeartbeat();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async synchronizeWithGlobalClock(): Promise<void> {
    try {
      const ntpTime = await this.getNTPTime();
      const localTime = Date.now();
      this.ntpOffset = ntpTime - localTime;
      
      if (Math.abs(this.ntpOffset) > 1000) {
        console.warn(`Large time offset detected: ${this.ntpOffset}ms`);
      }
      
      this.emit('sync-updated', { offset: this.ntpOffset });
    } catch (error) {
      console.error('NTP synchronization failed:', error);
      this.ntpOffset = 0;
    }
  }

  async joinPulseEvent(): Promise<PulseEvent> {
    if (!this.socket || this.syncStatus !== 'connected') {
      throw new Error('Not connected to pulse server');
    }

    const userId = await this.securityService.getUserId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join pulse timeout'));
      }, 10000);

      this.socket!.emit('join-pulse', {
        userId,
        timezone,
        timestamp: this.getNetworkTime()
      }, (response: PulseEvent | { error: string }) => {
        clearTimeout(timeout);
        
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  getNetworkTime(): number {
    return Date.now() + this.ntpOffset;
  }

  private async getNTPTime(): Promise<number> {
    const ntpServers = [
      'pool.ntp.org',
      'time.cloudflare.com',
      'time.google.com'
    ];

    for (const server of ntpServers) {
      try {
        const response = await fetch(`https://${server}/api/time`, {
          method: 'GET',
          timeout: 3000
        });
        
        if (response.ok) {
          const data: NTPResponse = await response.json();
          return data.timestamp;
        }
      } catch (error) {
        console.warn(`NTP server ${server} failed:`, error);
      }
    }

    // Fallback to local time if all NTP servers fail
    return Date.now();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.syncStatus = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      this.syncStatus = 'disconnected';
      this.emit('disconnected');
      this.handleReconnect();
    });

    this.socket.on('pulse-event', (event: PulseEvent) => {
      this.emit('pulse-event', event);
    });

    this.socket.on('sync-update', async () => {
      await this.synchronizeWithGlobalClock();
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max-reconnect-attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.socket && this.syncStatus === 'disconnected') {
        this.socket.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.syncStatus === 'connected') {
        this.socket.emit('heartbeat', { timestamp: this.getNetworkTime() });
      }
    }, 30000);
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.syncStatus = 'disconnected';
  }
}