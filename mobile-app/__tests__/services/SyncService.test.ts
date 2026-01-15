import { SyncService } from '../../src/services/SyncService';
import { Socket } from 'socket.io-client';
import { PulseEvent, SyncStatus } from '../../src/types/pulse';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
} as unknown as Socket;

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = new SyncService();
    (syncService as any).socket = mockSocket;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('synchronizeWithGlobalClock', () => {
    it('should calculate correct NTP offset', async () => {
      const mockNTPTime = 1640995200000;
      const mockCurrentTime = 1640995199500;
      
      jest.spyOn(Date, 'now').mockReturnValue(mockCurrentTime);
      jest.spyOn(syncService as any, 'getNTPTime').mockResolvedValue(mockNTPTime);

      await syncService.synchronizeWithGlobalClock();

      expect((syncService as any).ntpOffset).toBe(500);
    });

    it('should handle NTP sync failure gracefully', async () => {
      jest.spyOn(syncService as any, 'getNTPTime').mockRejectedValue(new Error('NTP failed'));

      await expect(syncService.synchronizeWithGlobalClock()).rejects.toThrow('NTP failed');
    });

    it('should retry NTP sync on failure', async () => {
      const getNTPTimeSpy = jest.spyOn(syncService as any, 'getNTPTime')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(1640995200000);

      await syncService.synchronizeWithGlobalClock();

      expect(getNTPTimeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('joinPulseEvent', () => {
    it('should emit join-pulse with correct user data', async () => {
      const userId = 'test-user-123';
      const mockPulseEvent: PulseEvent = {
        id: 'pulse-1',
        timestamp: 1640995200000,
        participants: 100,
        intensity: 0.8,
      };

      jest.spyOn(syncService as any, 'getUserId').mockResolvedValue(userId);
      mockSocket.emit = jest.fn().mockImplementation((event, data, callback) => {
        if (callback) callback(mockPulseEvent);
        return mockSocket;
      });

      const result = await syncService.joinPulseEvent();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-pulse', {
        userId,
        timezone: expect.any(String),
      }, expect.any(Function));
      expect(result).toEqual(mockPulseEvent);
    });

    it('should handle socket connection failure', async () => {
      (mockSocket as any).connected = false;

      await expect(syncService.joinPulseEvent()).rejects.toThrow('Socket not connected');
    });

    it('should validate user timezone format', async () => {
      const userId = 'test-user-123';
      jest.spyOn(syncService as any, 'getUserId').mockResolvedValue(userId);
      
      await syncService.joinPulseEvent();

      const emitCall = (mockSocket.emit as jest.Mock).mock.calls[0];
      const timezone = emitCall[1].timezone;
      expect(timezone).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$/);
    });
  });

  describe('getSynchronizedTime', () => {
    it('should return adjusted time with NTP offset', () => {
      (syncService as any).ntpOffset = 1000;
      const mockTime = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      const result = syncService.getSynchronizedTime();

      expect(result).toBe(mockTime + 1000);
    });

    it('should return current time when no offset available', () => {
      (syncService as any).ntpOffset = 0;
      const mockTime = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      const result = syncService.getSynchronizedTime();

      expect(result).toBe(mockTime);
    });
  });

  describe('leavePulseEvent', () => {
    it('should emit leave-pulse event', async () => {
      const userId = 'test-user-123';
      jest.spyOn(syncService as any, 'getUserId').mockResolvedValue(userId);

      await syncService.leavePulseEvent();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-pulse', { userId });
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status', () => {
      (mockSocket as any).connected = true;

      const status = syncService.getConnectionStatus();

      expect(status).toEqual({
        connected: true,
        ntpSynced: false,
        lastSync: null,
      });
    });

    it('should return disconnected status', () => {
      (mockSocket as any).connected = false;

      const status = syncService.getConnectionStatus();

      expect(status.connected).toBe(false);
    });
  });
});