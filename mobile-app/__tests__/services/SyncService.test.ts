import { SyncService } from '../../src/services/SyncService';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    };
    (io as jest.Mock).mockReturnValue(mockSocket);
    syncService = new SyncService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeSync', () => {
    it('should initialize sync service successfully', async () => {
      const ntpSpy = jest.spyOn(syncService as any, 'calibrateNTPTime')
        .mockResolvedValue(undefined);
      
      await syncService.initializeSync();
      
      expect(ntpSpy).toHaveBeenCalled();
      expect(io).toHaveBeenCalledWith(expect.stringContaining('sync'));
      expect(mockSocket.on).toHaveBeenCalledWith('pulse_countdown', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('global_pulse', expect.any(Function));
    });

    it('should handle initialization failure', async () => {
      jest.spyOn(syncService as any, 'calibrateNTPTime')
        .mockRejectedValue(new Error('NTP failed'));
      
      await expect(syncService.initializeSync()).rejects.toThrow('NTP failed');
    });
  });

  describe('calibrateNTPTime', () => {
    it('should calibrate NTP time with multiple samples', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'Thu, 01 Jan 2024 00:00:00 GMT' },
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'Thu, 01 Jan 2024 00:00:00 GMT' },
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'Thu, 01 Jan 2024 00:00:00 GMT' },
        });

      await (syncService as any).calibrateNTPTime();
      
      expect(fetch).toHaveBeenCalledTimes(3);
      expect((syncService as any).ntpOffset).toBeDefined();
    });

    it('should handle NTP calibration failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect((syncService as any).calibrateNTPTime()).rejects.toThrow();
    });
  });

  describe('getGlobalTime', () => {
    it('should return adjusted global time', () => {
      (syncService as any).ntpOffset = 1000;
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000000);
      
      const globalTime = syncService.getGlobalTime();
      
      expect(globalTime).toBe(1001000);
      Date.now = originalNow;
    });
  });

  describe('subscribeToGlobalPulse', () => {
    it('should subscribe to global pulse events', () => {
      const callback = jest.fn();
      
      syncService.subscribeToGlobalPulse(callback);
      
      expect(mockSocket.on).toHaveBeenCalledWith('global_pulse', callback);
    });
  });

  describe('getTimeUntilNextPulse', () => {
    it('should calculate time until next pulse correctly', () => {
      const nextPulse = Date.now() + 5000;
      (syncService as any).nextPulseTime = nextPulse;
      
      const timeUntil = syncService.getTimeUntilNextPulse();
      
      expect(timeUntil).toBeLessThanOrEqual(5000);
      expect(timeUntil).toBeGreaterThan(4000);
    });

    it('should return 0 if next pulse time is not set', () => {
      (syncService as any).nextPulseTime = null;
      
      const timeUntil = syncService.getTimeUntilNextPulse();
      
      expect(timeUntil).toBe(0);
    });
  });
});