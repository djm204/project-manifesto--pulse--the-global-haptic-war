import { SyncService } from '../../src/services/SyncService';
import { ApiService } from '../../src/services/ApiService';
import { PulseSession, SyncStatus } from '../../src/types/pulse';

// Mock socket.io-client
const mockSocket = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connected: true,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock ApiService
jest.mock('../../src/services/ApiService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService = new ApiService() as jest.Mocked<ApiService>;
    syncService = new SyncService();
    (syncService as any).apiService = mockApiService;
    (syncService as any).socket = mockSocket;
  });

  describe('synchronizeTime', () => {
    it('should calculate and store NTP offset', async () => {
      const serverTime = Date.now() + 1000; // Server is 1 second ahead
      mockApiService.getServerTime.mockResolvedValue(serverTime);
      const startTime = Date.now();

      await syncService.synchronizeTime();

      const syncedTime = syncService.getSyncedTime();
      expect(syncedTime).toBeGreaterThan(startTime);
      expect(Math.abs(syncedTime - serverTime)).toBeLessThan(100); // Allow 100ms tolerance
    });

    it('should handle server time fetch failure', async () => {
      mockApiService.getServerTime.mockRejectedValue(new Error('Network error'));

      await expect(syncService.synchronizeTime()).rejects.toThrow('Network error');
    });

    it('should retry time sync on failure', async () => {
      mockApiService.getServerTime
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue(Date.now());

      await syncService.synchronizeTime();

      expect(mockApiService.getServerTime).toHaveBeenCalledTimes(2);
    });
  });

  describe('joinGlobalPulse', () => {
    it('should join pulse session successfully', async () => {
      const mockSession: PulseSession = {
        id: 'pulse-123',
        startTime: Date.now() + 5000,
        duration: 10000,
        type: 'tap',
        participants: 1000,
        region: 'global'
      };

      mockApiService.getServerTime.mockResolvedValue(Date.now());
      mockSocket.emit.mockImplementation((event, data) => {
        if (event === 'join-pulse') {
          setTimeout(() => {
            const callback = mockSocket.on.mock.calls.find(call => call[0] === 'pulse-session')?.[1];
            callback?.(mockSession);
          }, 50);
        }
      });
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'pulse-session') {
          setTimeout(() => callback(mockSession), 100);
        }
      });

      const session = await syncService.joinGlobalPulse();

      expect(session).toEqual(mockSession);
      expect(mockSocket.emit).toHaveBeenCalledWith('join-pulse', { userId: expect.any(String) });
    });

    it('should timeout if no pulse session received', async () => {
      mockApiService.getServerTime.mockResolvedValue(Date.now());
      mockSocket.on.mockImplementation(() => {}); // No callback execution

      await expect(syncService.joinGlobalPulse()).rejects.toThrow('Pulse join timeout');
    }, 10000);

    it('should synchronize time before joining pulse', async () => {
      const syncSpy = jest.spyOn(syncService, 'synchronizeTime');
      mockApiService.getServerTime.mockResolvedValue(Date.now());
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'pulse-session') {
          callback({ id: 'test', startTime: Date.now(), duration: 5000, type: 'tap', participants: 1, region: 'global' });
        }
      });

      await syncService.joinGlobalPulse();

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('getSyncStatus', () => {
    it('should return connected status when socket is connected', () => {
      mockSocket.connected = true;
      (syncService as any).ntpOffset = 100;

      const status = syncService.getSyncStatus();

      expect(status).toEqual({
        connected: true,
        synchronized: true,
        offset: 100,
        lastSync: expect.any(Number)
      });
    });

    it('should return disconnected status when socket is not connected', () => {
      mockSocket.connected = false;

      const status = syncService.getSyncStatus();

      expect(status.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and cleanup listeners', () => {
      syncService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalledWith('pulse-session');
      expect(mockSocket.off).toHaveBeenCalledWith('pulse-countdown');
    });
  });

  describe('error handling', () => {
    it('should handle socket connection errors', () => {
      const errorHandler = jest.fn();
      syncService.onError(errorHandler);

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          callback(new Error('Connection failed'));
        }
      });

      // Trigger the error
      const errorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      errorCallback?.(new Error('Connection failed'));

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});