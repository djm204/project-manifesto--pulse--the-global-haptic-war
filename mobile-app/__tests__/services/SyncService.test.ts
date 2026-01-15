import { SyncService } from '../../src/services/SyncService';
import { SecurityService } from '../../src/services/SecurityService';
import { PrivacyService } from '../../src/services/PrivacyService';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');
jest.mock('../../src/services/SecurityService');
jest.mock('../../src/services/PrivacyService');

const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

(io as jest.Mock).mockReturnValue(mockSocket);

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSecurityService: jest.Mocked<SecurityService>;
  let mockPrivacyService: jest.Mocked<PrivacyService>;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = new SyncService();
    mockSecurityService = new SecurityService() as jest.Mocked<SecurityService>;
    mockPrivacyService = new PrivacyService() as jest.Mocked<PrivacyService>;
    
    // Mock fetch for NTP queries
    global.fetch = jest.fn();
  });

  afterEach(() => {
    syncService.disconnect();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid NTP and connection', async () => {
      // Mock NTP response
      (global.fetch as jest.Mock).mockResolvedValue({
        headers: {
          get: jest.fn().mockReturnValue(new Date().toISOString()),
        },
      });

      mockSecurityService.getAuthToken.mockResolvedValue('valid-token');
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 10);
        }
      });

      await expect(syncService.initialize()).resolves.not.toThrow();
    });

    it('should throw error when all NTP servers fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(syncService.initialize()).rejects.toThrow('All NTP servers failed');
    });

    it('should throw error when connection fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        headers: {
          get: jest.fn().mockReturnValue(new Date().toISOString()),
        },
      });

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection failed')), 10);
        }
      });

      await expect(syncService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('synchronizeGlobalPulse', () => {
    beforeEach(async () => {
      // Setup successful initialization
      (global.fetch as jest.Mock).mockResolvedValue({
        headers: {
          get: jest.fn().mockReturnValue(new Date().toISOString()),
        },
      });

      mockSecurityService.getAuthToken.mockResolvedValue('valid-token');
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 10);
        }
      });

      await syncService.initialize();
    });

    it('should synchronize pulse successfully with valid consent', async () => {
      mockPrivacyService.hasValidConsent.mockResolvedValue(true);
      mockSecurityService.encryptData.mockResolvedValue('encrypted-payload');
      mockSecurityService.getDeviceId.mockResolvedValue('device-123');

      mockSocket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'pulse_sync_request') {
          setTimeout(() => callback({
            success: true,
            pulseId: 'pulse-123',
            timestamp: Date.now(),
            participants: 100,
          }), 10);
        }
      });

      const result = await syncService.synchronizeGlobalPulse();

      expect(result).toEqual({
        id: 'pulse-123',
        timestamp: expect.any(Number),
        participants: 100,
        globalSync: true,
      });
      expect(mockPrivacyService.hasValidConsent).toHaveBeenCalledWith('pulse_sync');
    });

    it('should throw error when user consent is not given', async () => {
      mockPrivacyService.hasValidConsent.mockResolvedValue(false);

      await expect(syncService.synchronizeGlobalPulse()).rejects.toThrow(
        'User consent required for pulse synchronization'
      );
    });

    it('should throw error when not connected', async () => {
      syncService.disconnect();
      mockPrivacyService.hasValidConsent.mockResolvedValue(true);

      await expect(syncService.synchronizeGlobalPulse()).rejects.toThrow(
        'Not connected to sync server'
      );
    });

    it('should handle sync timeout', async () => {
      mockPrivacyService.hasValidConsent.mockResolvedValue(true);
      mockSecurityService.encryptData.mockResolvedValue('encrypted-payload');
      mockSecurityService.getDeviceId.mockResolvedValue('device-123');

      // Don't call callback to simulate timeout
      mockSocket.emit.mockImplementation(() => {});

      await expect(syncService.synchronizeGlobalPulse()).rejects.toThrow(
        'Pulse synchronization timeout'
      );
    });
  });

  describe('isConnectionActive', () => {
    it('should return true when connected', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        headers: {
          get: jest.fn().mockReturnValue(new Date().toISOString()),
        },
      });

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 10);
        }
      });

      await syncService.initialize();
      expect(syncService.isConnectionActive()).toBe(true);
    });

    it('should return false when disconnected', () => {
      expect(syncService.isConnectionActive()).toBe(false);
    });
  });
});