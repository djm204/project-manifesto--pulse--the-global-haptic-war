import { SyncService } from '../../src/services/SyncService';
import { SecurityService } from '../../src/services/SecurityService';
import { io } from 'socket.io-client';

jest.mock('../../src/services/SecurityService');
jest.mock('socket.io-client');

describe('SyncService', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };
    (io as jest.Mock).mockReturnValue(mockSocket);
    (SecurityService.getSecureToken as jest.Mock).mockResolvedValue('mock-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
    SyncService.disconnect();
  });

  describe('initialize', () => {
    it('should initialize socket connection successfully', async () => {
      await SyncService.initialize();
      
      expect(io).toHaveBeenCalledWith(expect.any(String), {
        auth: { token: 'mock-token' },
        transports: ['websocket'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    });

    it('should throw error when no token available', async () => {
      (SecurityService.getSecureToken as jest.Mock).mockResolvedValue(null);
      
      await expect(SyncService.initialize()).rejects.toThrow('Authentication required');
    });

    it('should setup event handlers on initialization', async () => {
      await SyncService.initialize();
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('sync_event', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('time_sync_response', expect.any(Function));
    });
  });

  describe('subscribeTo', () => {
    it('should register callback and return subscription ID', async () => {
      await SyncService.initialize();
      const callback = jest.fn();
      
      const subscriptionId = SyncService.subscribeTo('PULSE', callback);
      
      expect(subscriptionId).toMatch(/^PULSE_\d+_[\d.]+$/);
    });

    it('should call registered callback when sync event received', async () => {
      await SyncService.initialize();
      const callback = jest.fn();
      
      SyncService.subscribeTo('PULSE', callback);
      
      // Simulate sync event
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'sync_event')[1];
      const mockEvent = { id: '123', timestamp: Date.now(), type: 'PULSE', data: {} };
      
      connectHandler(mockEvent);
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        type: 'PULSE'
      }));
    });
  });

  describe('unsubscribe', () => {
    it('should remove callback subscription', async () => {
      await SyncService.initialize();
      const callback = jest.fn();
      
      const subscriptionId = SyncService.subscribeTo('PULSE', callback);
      SyncService.unsubscribe(subscriptionId);
      
      // Simulate sync event
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'sync_event')[1];
      connectHandler({ id: '123', timestamp: Date.now(), type: 'PULSE', data: {} });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getSyncStatus', () => {
    it('should return correct sync status', async () => {
      await SyncService.initialize();
      
      const status = SyncService.getSyncStatus();
      
      expect(status).toEqual({
        connected: expect.any(Boolean),
        latency: expect.any(Number),
        serverTime: expect.any(Number),
        localOffset: expect.any(Number)
      });
    });
  });

  describe('getServerTime', () => {
    it('should return server-adjusted time', async () => {
      await SyncService.initialize();
      
      const serverTime = SyncService.getServerTime();
      
      expect(typeof serverTime).toBe('number');
      expect(serverTime).toBeGreaterThan(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and clear callbacks', async () => {
      await SyncService.initialize();
      
      SyncService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});