import { SyncService } from '../../src/services/SyncService';
import io from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connected: false,
    };
    
    (io as jest.Mock).mockReturnValue(mockSocket);
    syncService = new SyncService('ws://test-server:3000');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should establish WebSocket connection', async () => {
      mockSocket.connected = true;
      mockSocket.connect.mockImplementation(() => {
        mockSocket.connected = true;
      });

      await syncService.connect();

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('pulse-sync', expect.any(Function));
    });

    it('should handle connection failure', async () => {
      mockSocket.connect.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(syncService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', () => {
      syncService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('syncTime', () => {
    it('should synchronize time with server', async () => {
      const mockServerTime = Date.now();
      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'time-sync') {
          callback({ serverTime: mockServerTime });
        }
      });

      const result = await syncService.syncTime();

      expect(mockSocket.emit).toHaveBeenCalledWith('time-sync', expect.any(Function));
      expect(result).toBeCloseTo(mockServerTime, -2); // Within 100ms
    });

    it('should handle sync timeout', async () => {
      mockSocket.emit.mockImplementation(() => {
        // Simulate timeout - don't call callback
      });

      await expect(syncService.syncTime()).rejects.toThrow('Time sync timeout');
    });
  });

  describe('joinPulse', () => {
    it('should join pulse session', async () => {
      const pulseId = 'pulse-123';
      
      await syncService.joinPulse(pulseId);

      expect(mockSocket.emit).toHaveBeenCalledWith('join-pulse', { pulseId });
    });
  });

  describe('submitPulse', () => {
    it('should submit pulse data', async () => {
      const pulseData = {
        timestamp: Date.now(),
        pattern: 'tap' as const,
        intensity: 0.8,
        userId: 'user-123',
      };

      await syncService.submitPulse(pulseData);

      expect(mockSocket.emit).toHaveBeenCalledWith('pulse-submit', pulseData);
    });
  });

  describe('isConnected', () => {
    it('should return connection status', () => {
      mockSocket.connected = true;
      
      expect(syncService.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      
      expect(syncService.isConnected()).toBe(false);
    });
  });
});