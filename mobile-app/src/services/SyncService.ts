import io, { Socket } from 'socket.io-client';
import { API_BASE_URL, NTP_SERVERS } from '../utils/constants';

export class SyncService {
  private ntpOffset: number = 0;
  private socket: Socket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    this.socket = io(API_BASE_URL, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('Connected to sync server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from sync server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
    });
  }

  async synchronizeGlobalTime(): Promise<void> {
    try {
      const ntpTime = await this.getNTPTime();
      this.ntpOffset = ntpTime - Date.now();
      console.log(`NTP offset: ${this.ntpOffset}ms`);
    } catch (error) {
      console.error('Failed to synchronize time:', error);
      throw new Error('Time synchronization failed');
    }
  }

  private async getNTPTime(): Promise<number> {
    const server = NTP_SERVERS[Math.floor(Math.random() * NTP_SERVERS.length)];
    
    try {
      const response = await fetch(`https://worldtimeapi.org/api/timezone/UTC`);
      const data = await response.json();
      return new Date(data.utc_datetime).getTime();
    } catch (error) {
      console.error('NTP request failed:', error);
      return Date.now(); // Fallback to local time
    }
  }

  getGlobalTimestamp(): number {
    return Date.now() + this.ntpOffset;
  }

  subscribeToGlobalPulse(callback: (countdown: number) => void): void {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.on('pulse_countdown', callback);
  }

  subscribeToParticipantCount(callback: (count: number) => void): void {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.on('participant_count', callback);
  }

  async submitPulse(timestamp: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('submit_pulse', { timestamp }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}