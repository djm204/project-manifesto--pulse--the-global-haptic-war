import { SyncService } from '../../src/services/SyncService';
import { SecurityService } from '../../src/services/SecurityService';
import { PulseEvent, SyncState } from '../../src/types/pulse';

jest.mock('socket.io-client');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      connected: true,
      id: 'test-socket-id',
    };

    require('socket.io-client').io.mockReturnValue(mockSocket);
    syncService = SyncService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SyncService.getInstance();
      const instance2 = SyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should establish connection successfully', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await syncService.connect();
      
      expect(mockSocket.connect).toHaveBeenCalled();
      expect(syncService.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
      });

      await expect(syncService.connect()).rejects.toThrow('Connection failed');
    });

    it('should not reconnect if already connected', async () => {
      syncService['connected'] = true;
      await syncService.connect();
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', () => {
      syncService['connected'] = true;
      syncService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(syncService.isConnected()).toBe(false);
    });
  });

  describe('pulse events', () => {
    it('should emit pulse event with valid data', () => {
      const pulseEvent: PulseEvent = {
        userId: 'user123',
        timestamp: Date.now(),
        intensity: 5,
        pattern: 'tap',
        location: { lat: 40.7128, lng: -74.0060 },
      };

      syncService.emitPulse(pulseEvent);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('pulse', pulseEvent);
    });

    it('should validate pulse event data', () => {
      const invalidPulseEvent = {
        userId: '',
        timestamp: Date.now(),
        intensity: 15, // Invalid intensity > 10
        pattern: 'invalid',
      } as PulseEvent;

      expect(() => syncService.emitPulse(invalidPulseEvent)).toThrow();
    });
  });

  describe('time synchronization', () => {
    it('should synchronize time with server', async () => {
      const serverTime = Date.now() + 5000;
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'time_sync') {
          setTimeout(() => callback({ serverTime }), 0);
        }
      });

      await syncService.syncTime();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('request_time_sync');
      expect(syncService.getServerTime()).toBeCloseTo(serverTime, -2);
    });

    it('should handle time sync timeout', async () => {
      jest.useFakeTimers();
      
      const syncPromise = syncService.syncTime();
      jest.advanceTimersByTime(6000); // Advance past timeout
      
      await expect(syncPromise).rejects.toThrow('Time sync timeout');
      
      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle socket errors gracefully', () => {
      const errorHandler = jest.fn();
      syncService.onError(errorHandler);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(new Error('Socket error'));
        }
      });

      // Trigger error
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorCallback(new Error('Socket error'));

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('security integration', () => {
    it('should encrypt sensitive pulse data', () => {
      const securityService = SecurityService.getInstance();
      const encryptSpy = jest.spyOn(securityService, 'encrypt');

      const pulseEvent: PulseEvent = {
        userId: 'user123',
        timestamp: Date.now(),
        intensity: 5,
        pattern: 'tap',
        location: { lat: 40.7128, lng: -74.0060 },
      };

      syncService.emitPulse(pulseEvent);
      
      expect(encryptSpy).toHaveBeenCalledWith(pulseEvent.userId);
    });
  });
});