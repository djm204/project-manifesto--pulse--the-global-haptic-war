import { SyncService } from '../../src/services/SyncService';
import { HapticService } from '../../src/services/HapticService';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('socket.io-client');
jest.mock('../../src/services/HapticService');

const mockSocket = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connected: true,
};

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = SyncService.getInstance();
    (io as jest.Mock).mockReturnValue(mockSocket);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SyncService.getInstance();
      const instance2 = SyncService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should establish socket connection', async () => {
      const mockUserId = 'user123';
      const connectPromise = syncService.connect(mockUserId);
      
      // Simulate connection success
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectCallback();
      
      await connectPromise;
      
      expect(io).toHaveBeenCalledWith(expect.any(String), {
        auth: { userId: mockUserId },
        transports: ['websocket'],
      });
    });

    it('should handle connection error', async () => {
      const mockUserId = 'user123';
      const connectPromise = syncService.connect(mockUserId);
      
      // Simulate connection error
      const errorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
      errorCallback(new Error('Connection failed'));
      
      await expect(connectPromise).rejects.toThrow('Connection failed');
    });
  });

  describe('synchronizeWithServer', () => {
    it('should synchronize time with server', async () => {
      const mockServerTime = Date.now() + 1000;
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'time_sync') {
          callback({ serverTime: mockServerTime });
        }
      });

      await syncService.synchronizeWithServer();

      expect(syncService.getGlobalTime()).toBeCloseTo(mockServerTime, -2);
    });

    it('should handle sync failure', async () => {
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'time_sync') {
          callback({ error: 'Sync failed' });
        }
      });

      await expect(syncService.synchronizeWithServer()).rejects.toThrow('Time sync failed');
    });
  });

  describe('scheduleGlobalPulse', () => {
    beforeEach(async () => {
      await syncService.synchronizeWithServer();
    });

    it('should schedule pulse for future timestamp', () => {
      const futureTime = Date.now() + 5000;
      
      syncService.scheduleGlobalPulse(futureTime);
      
      // Fast forward time
      jest.advanceTimersByTime(5000);
      
      expect(HapticService.triggerPulse).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('pulse_triggered');
    });

    it('should not schedule pulse for past timestamp', () => {
      const pastTime = Date.now() - 1000;
      
      syncService.scheduleGlobalPulse(pastTime);
      
      expect(HapticService.triggerPulse).not.toHaveBeenCalled();
    });
  });

  describe('getGlobalTime', () => {
    it('should return adjusted global time', async () => {
      const mockServerTime = Date.now() + 2000;
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'time_sync') {
          callback({ serverTime: mockServerTime });
        }
      });

      await syncService.synchronizeWithServer();
      const globalTime = syncService.getGlobalTime();

      expect(globalTime).toBeCloseTo(mockServerTime, -2);
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

  describe('disconnect', () => {
    it('should disconnect socket', () => {
      syncService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});