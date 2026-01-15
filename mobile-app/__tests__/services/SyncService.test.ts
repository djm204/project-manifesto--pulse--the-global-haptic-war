import { SyncService, PulseEvent, SyncStatus } from '../../src/services/SyncService';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('../../src/services/ApiService');
jest.mock('../../src/services/SecurityService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
      disconnect: jest.fn(),
    };
    
    (io as jest.Mock).mockReturnValue(mockSocket);
    syncService = new SyncService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with proper setup', async () => {
      // Mock successful connection
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      mockSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'time_sync_response') {
          setTimeout(() => callback({
            serverTime: Date.now(),
            clientTime: Date.now() - 100
          }), 0);
        }
      });

      await expect(syncService.initialize()).resolves.not.toThrow();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.emit).toHaveBeenCalledWith('time_sync_request', expect.any(Object));
    });

    it('should handle connection errors gracefully', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
      });

      await expect(syncService.initialize()).rejects.toThrow('SyncService initialization failed');
    });
  });

  describe('synchronizeGlobalTime', () => {
    beforeEach(async () => {
      // Setup connected state
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      
      await syncService.initialize();
    });

    it('should calculate NTP offset correctly', async () => {
      const serverTime = Date.now() + 1000; // Server is 1 second ahead
      
      mockSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'time_sync_response') {
          setTimeout(() => callback({
            serverTime,
            clientTime: Date.now() - 50
          }), 10); // Simulate 10ms round trip
        }
      });

      await syncService.synchronizeGlobalTime();
      
      const globalTime = syncService.getGlobalTime();
      const localTime = new Date();
      
      // Should be approximately 1 second ahead (accounting for processing time)
      expect(globalTime.getTime()).toBeGreaterThan(localTime.getTime() + 900);
      expect(globalTime.getTime()).toBeLessThan(localTime.getTime() + 1100);
    });

    it('should handle sync timeout', async () => {
      mockSocket.once.mockImplementation(() => {
        // Don't call callback to simulate timeout
      });

      await expect(syncService.synchronizeGlobalTime()).rejects.toThrow('Time sync timeout');
    });
  });

  describe('schedulePulseEvent', () => {
    beforeEach(async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      
      mockSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'time_sync_response') {
          setTimeout(() => callback({
            serverTime: Date.now(),
            clientTime: Date.now()
          }), 0);
        }
      });
      
      await syncService.initialize();
    });

    it('should schedule pulse event successfully', async () => {
      const eventTime = new Date(Date.now() + 60000); // 1 minute from now
      const mockEventId = 'pulse_123_abc';

      mockSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event.startsWith('pulse_scheduled_')) {
          setTimeout(() => callback({ success: true }), 0);
        }
      });

      const eventId = await syncService.schedulePulseEvent(eventTime);
      
      expect(eventId).toMatch(/^pulse_\d+_[a-z0-9]+$/);
      expect(mockSocket.emit).toHaveBeenCalledWith('schedule_pulse', {
        eventId: expect.any(String),
        scheduledTime: eventTime.getTime(),
        clientOffset: expect.any(Number)
      });
    });

    it('should handle scheduling errors', async () => {
      const eventTime = new Date(Date.now() + 60000);

      mockSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event.startsWith('pulse_scheduled_')) {
          setTimeout(() => callback({ success: false, error: 'Invalid time' }), 0);
        }
      });

      await expect(syncService.schedulePulseEvent(eventTime)).rejects.toThrow('Invalid time');
    });
  });

  describe('event handling', () => {
    it('should emit pulse_start events', (done) => {
      const mockPulseEvent: PulseEvent = {
        id: 'test-pulse-1',
        scheduledTime: new Date(),
        duration: 5000,
        intensity: 0.8,
        globalParticipants: 1000000
      };

      syncService.onPulseStart((event) => {
        expect(event).toEqual(mockPulseEvent);
        done();
      });

      // Simulate receiving pulse_start event
      const pulseStartHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pulse_start'
      )?.[1];
      
      if (pulseStartHandler) {
        pulseStartHandler(mockPulseEvent);
      }
    });

    it('should emit pulse_end events', (done) => {
      const eventId = 'test-pulse-1';

      syncService.onPulseEnd((id) => {
        expect(id).toBe(eventId);
        done();
      });

      // Simulate receiving pulse_end event
      const pulseEndHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pulse_end'
      )?.[1];
      
      if (pulseEndHandler) {
        pulseEndHandler(eventId);
      }
    });
  });

  describe('getSyncStatus', () => {
    it('should return current sync status', () => {
      const status = syncService.getSyncStatus();
      
      expect(status).toEqual({
        isConnected: expect.any(Boolean),
        latency: expect.any(Number),
        ntpOffset: expect.any(Number),
        lastSync: expect.any(Date)
      });
    });
  });

  describe('disconnect', () => {
    it('should clean up resources properly', async () => {
      await syncService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(syncService.listenerCount('pulse_start')).toBe(0);
      expect(syncService.listenerCount('pulse_end')).toBe(0);
    });
  });
});