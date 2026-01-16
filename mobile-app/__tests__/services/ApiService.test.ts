import { ApiService } from '../../src/services/ApiService';
import { SecurityService } from '../../src/services/SecurityService';
import { APIResponse, ThreatAssessment } from '../../src/types';

// Mock SecurityService
jest.mock('../../src/services/SecurityService');

describe('ApiService', () => {
  let apiService: ApiService;
  let mockSecurityService: jest.Mocked<SecurityService>;

  beforeEach(() => {
    mockSecurityService = {
      detectThreat: jest.fn(),
      encryptPII: jest.fn(),
      auditDataAccess: jest.fn(),
    } as any;
    
    (SecurityService as jest.MockedClass<typeof SecurityService>).mockImplementation(
      () => mockSecurityService
    );

    apiService = new ApiService('https://test-api.com');
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should make successful GET request', async () => {
      const mockResponse: APIResponse<{ id: string }> = {
        success: true,
        data: { id: '123' },
      };

      mockSecurityService.detectThreat.mockResolvedValue({
        riskLevel: 'LOW',
        threats: [],
        blocked: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.request('/test', 'GET');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'GlobalPulse/1.0.0',
            'X-API-Version': '1.0',
          }),
        })
      );
    });

    it('should make successful POST request with body', async () => {
      const requestBody = { name: 'test' };
      const mockResponse: APIResponse<{ id: string }> = {
        success: true,
        data: { id: '123' },
      };

      mockSecurityService.detectThreat.mockResolvedValue({
        riskLevel: 'LOW',
        threats: [],
        blocked: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.request('/test', 'POST', requestBody);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should throw error when threat is detected', async () => {
      const threatAssessment: ThreatAssessment = {
        riskLevel: 'HIGH',
        threats: ['SQL_INJECTION'],
        blocked: true,
        reason: 'Malicious request detected',
      };

      mockSecurityService.detectThreat.mockResolvedValue(threatAssessment);

      await expect(
        apiService.request('/test', 'GET')
      ).rejects.toThrow('Request blocked: Malicious request detected');
    });

    it('should handle network errors', async () => {
      mockSecurityService.detectThreat.mockResolvedValue({
        riskLevel: 'LOW',
        threats: [],
        blocked: false,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        apiService.request('/test', 'GET')
      ).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      mockSecurityService.detectThreat.mockResolvedValue({
        riskLevel: 'LOW',
        threats: [],
        blocked: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(
        apiService.request('/test', 'GET')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should add custom headers', async () => {
      const customHeaders = { 'Authorization': 'Bearer token123' };
      
      mockSecurityService.detectThreat.mockResolvedValue({
        riskLevel: 'LOW',
        threats: [],
        blocked: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await apiService.request('/test', 'GET', null, customHeaders);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
          }),
        })
      );
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      const spy = jest.spyOn(apiService, 'request').mockResolvedValue({
        success: true,
        data: { id: '123' },
      });

      await apiService.get('/users/123');

      expect(spy).toHaveBeenCalledWith('/users/123', 'GET', undefined, undefined);
    });
  });

  describe('post', () => {
    it('should make POST request', async () => {
      const data = { name: 'test' };
      const spy = jest.spyOn(apiService, 'request').mockResolvedValue({
        success: true,
        data: { id: '123' },
      });

      await apiService.post('/users', data);

      expect(spy).toHaveBeenCalledWith('/users', 'POST', data, undefined);
    });
  });

  describe('put', () => {
    it('should make PUT request', async () => {
      const data = { name: 'updated' };
      const spy = jest.spyOn(apiService, 'request').mockResolvedValue({
        success: true,
        data: { id: '123' },
      });

      await apiService.put('/users/123', data);

      expect(spy).toHaveBeenCalledWith('/users/123', 'PUT', data, undefined);
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const spy = jest.spyOn(apiService, 'request').mockResolvedValue({
        success: true,
        data: null,
      });

      await apiService.delete('/users/123');

      expect(spy).toHaveBeenCalledWith('/users/123', 'DELETE', undefined, undefined);
    });
  });
});