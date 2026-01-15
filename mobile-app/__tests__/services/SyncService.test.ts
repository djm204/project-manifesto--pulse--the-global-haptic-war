import { SyncService } from '../../src/services/SyncService';
import { ApiService } from '../../src/services/ApiService';

jest.mock('../../src/services/ApiService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    mockApiService = new ApiService() as jest.Mocked<ApiService>;
    syncService = new SyncService();
    jest.clearAllMocks();
  });

  describe('getGlobalPulseTime', () => {
    it('should return synchronized pulse time with acceptable accuracy', async () => {
      const mockServerTime = Date.now() + 60000; // 1 minute from now
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime: mockServerTime,
          serverTime: Date.now()
        }
      });

      const result = await syncService.getGlobalPulseTime();

      expect(result.nextPulseTime).toBe(mockServerTime);
      expect(result.accuracy).toBeLessThan(100); // Within 100ms
    });

    it('should handle network errors gracefully', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));

      await expect(syncService.getGlobalPulseTime()).rejects.toThrow('Network error');
    });

    it('should calculate time offset correctly', async () => {
      const serverTime = Date.now() - 5000; // Server is 5 seconds behind
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime: serverTime + 60000,
          serverTime: serverTime
        }
      });

      const result = await syncService.getGlobalPulseTime();

      expect(result.offset).toBeCloseTo(5000, -2); // Within 100ms of 5000ms
    });
  });

  describe('synchronizeTime', () => {
    it('should perform NTP-style time synchronization', async () => {
      const mockNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      mockApiService.get.mockResolvedValue({
        data: { serverTime: mockNow - 1000 } // Server 1 second behind
      });

      const offset = await syncService.synchronizeTime();

      expect(offset).toBeCloseTo(1000, -2);
    });

    it('should handle multiple sync attempts', async () => {
      mockApiService.get
        .mockResolvedValueOnce({ data: { serverTime: Date.now() - 1000 } })
        .mockResolvedValueOnce({ data: { serverTime: Date.now() - 1100 } })
        .mockResolvedValueOnce({ data: { serverTime: Date.now() - 900 } });

      const offset = await syncService.synchronizeTime();

      expect(mockApiService.get).toHaveBeenCalledTimes(3);
      expect(typeof offset).toBe('number');
    });
  });

  describe('getTimeUntilNextPulse', () => {
    it('should calculate correct time until next pulse', async () => {
      const nextPulseTime = Date.now() + 30000; // 30 seconds from now
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime,
          serverTime: Date.now()
        }
      });

      const timeUntil = await syncService.getTimeUntilNextPulse();

      expect(timeUntil).toBeGreaterThan(29000);
      expect(timeUntil).toBeLessThan(31000);
    });

    it('should return 0 if pulse time has passed', async () => {
      const nextPulseTime = Date.now() - 5000; // 5 seconds ago
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime,
          serverTime: Date.now()
        }
      });

      const timeUntil = await syncService.getTimeUntilNextPulse();

      expect(timeUntil).toBe(0);
    });
  });

  describe('isPulseActive', () => {
    it('should return true during pulse window', async () => {
      const now = Date.now();
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime: now - 500, // Pulse started 500ms ago
          serverTime: now
        }
      });

      const isActive = await syncService.isPulseActive();

      expect(isActive).toBe(true);
    });

    it('should return false outside pulse window', async () => {
      const now = Date.now();
      mockApiService.get.mockResolvedValue({
        data: { 
          nextPulseTime: now + 30000, // Next pulse in 30 seconds
          serverTime: now
        }
      });

      const isActive = await syncService.isPulseActive();

      expect(isActive).toBe(false);
    });
  });
});