import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { SecurityService } from './SecurityService';
import { EncryptionService } from '../utils/encryption';
import { ValidationError, ConnectionError } from '../types/errors';

interface SyncMessage {
  type: 'pulse' | 'leaderboard' | 'heartbeat';
  payload: any;
  timestamp: number;
  userId: string;
}

interface ConnectionConfig {
  url: string;
  maxRetries: number;
  retryDelay: number;
  heartbeatInterval: number;
}

export class SyncService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: SyncMessage[] = [];
  private isConnected = false;

  private readonly config: ConnectionConfig = {
    url: process.env.WEBSOCKET_URL || 'wss://api.globalpulse.com/sync',
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000
  };

  constructor() {
    super();
    this.setupConnectionHandlers();
  }

  async connect(userId: string, token: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Validate authentication
      await SecurityService.validateJWT(token);
      
      this.ws = new WebSocket(this.config.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'GlobalPulse/1.0'
        }
      });

      this.setupWebSocketHandlers(userId);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ConnectionError('Connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          reject(new ConnectionError(`Connection failed: ${error.message}`));
        };
      });
    } catch (error) {
      throw new ConnectionError(`Failed to establish connection: ${error.message}`);
    }
  }

  async sendPulse(pulseData: any): Promise<void> {
    const validatedData = SecurityService.validatePulseData(pulseData);
    const encryptedData = await EncryptionService.encryptPII(JSON.stringify(validatedData));
    
    const message: SyncMessage = {
      type: 'pulse',
      payload: encryptedData,
      timestamp: Date.now(),
      userId: pulseData.userId
    };

    await this.sendMessage(message);
  }

  async sendMessage(message: SyncMessage): Promise<void> {
    if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      const serialized = JSON.stringify(message);
      this.ws.send(serialized);
    } catch (error) {
      this.messageQueue.push(message);
      throw new ConnectionError(`Failed to send message: ${error.message}`);
    }
  }

  private setupWebSocketHandlers(userId: string): void {
    if (!this.ws) return;

    this.ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as SyncMessage;
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnected');
      this.attemptReconnection(userId);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private async handleIncomingMessage(message: SyncMessage): Promise<void> {
    switch (message.type) {
      case 'pulse':
        const decryptedData = await EncryptionService.decryptPII(message.payload);
        this.emit('pulseUpdate', JSON.parse(decryptedData));
        break;
      case 'leaderboard':
        this.emit('leaderboardUpdate', message.payload);
        break;
      case 'heartbeat':
        // Acknowledge heartbeat
        break;
    }
  }

  private setupConnectionHandlers(): void {
    this.on('error', (error) => {
      console.error('Sync service error:', error);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async attemptReconnection(userId: string): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.emit('maxRetriesReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(async () => {
      try {
        const token = await SecurityService.getStoredToken();
        await this.connect(userId, token);
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).catch(console.error);
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
  }
}