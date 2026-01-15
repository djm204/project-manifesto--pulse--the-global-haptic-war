import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../utils/constants';
import { SecurityService } from './SecurityService';

export interface SyncEvent {
  id: string;
  timestamp: number;
  type: 'PULSE' | 'COUNTDOWN' | 'RESULT';
  data: any;
}

export interface SyncStatus {
  connected: boolean;
  latency: number;
  serverTime: number;
  localOffset: number;
}

class SyncServiceClass {
  private socket: Socket | null = null;
  private syncCallbacks: Map<string, (event: SyncEvent) => void> = new Map();
  private latencyMeasurements: number[] = [];
  private serverTimeOffset: number = 0;
  private isConnected: boolean = false;

  async initialize(): Promise<void> {
    try {
      const token = await SecurityService.getSecureToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      this.socket = io(API_CONFIG.WEBSOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupEventHandlers();
      await this.performTimeSync();
    } catch (error) {
      console.error('SyncService initialization failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to sync server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from sync server');
    });

    this.socket.on('sync_event', (event: SyncEvent) => {
      this.handleSyncEvent(event);
    });

    this.socket.on('time_sync_response', (data: { serverTime: number; requestTime: number }) => {
      this.handleTimeSyncResponse(data);
    });
  }

  private async performTimeSync(): Promise<void> {
    if (!this.socket) return;

    const requestTime = Date.now();
    this.socket.emit('time_sync_request', { requestTime });
  }

  private handleTimeSyncResponse(data: { serverTime: number; requestTime: number }): void {
    const responseTime = Date.now();
    const roundTripTime = responseTime - data.requestTime;
    const latency = roundTripTime / 2;
    
    this.latencyMeasurements.push(latency);
    if (this.latencyMeasurements.length > 10) {
      this.latencyMeasurements.shift();
    }

    const estimatedServerTime = data.serverTime + latency;
    this.serverTimeOffset = estimatedServerTime - responseTime;
  }

  private handleSyncEvent(event: SyncEvent): void {
    // Apply time correction
    const correctedEvent = {
      ...event,
      timestamp: event.timestamp + this.serverTimeOffset
    };

    // Notify all registered callbacks
    this.syncCallbacks.forEach(callback => {
      try {
        callback(correctedEvent);
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  subscribeTo(eventType: string, callback: (event: SyncEvent) => void): string {
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;
    this.syncCallbacks.set(subscriptionId, callback);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.syncCallbacks.delete(subscriptionId);
  }

  getSyncStatus(): SyncStatus {
    const avgLatency = this.latencyMeasurements.length > 0 
      ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length 
      : 0;

    return {
      connected: this.isConnected,
      latency: avgLatency,
      serverTime: Date.now() + this.serverTimeOffset,
      localOffset: this.serverTimeOffset
    };
  }

  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.syncCallbacks.clear();
  }
}

export const SyncService = new SyncServiceClass();