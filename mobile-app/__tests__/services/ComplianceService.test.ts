import { ComplianceService } from '../../src/services/ComplianceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERMISSIONS, RESULTS } from 'react-native-permissions';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-permissions');

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestATTPermission', () => {
    it('should request ATT permission successfully', async () => {
      const mockRequest = jest.fn().mockResolvedValue(RESULTS.GRANTED);
      require('react-native-permissions').request = mockRequest;

      const result = await ComplianceService.requestATTPermission();
      
      expect(result).toBe(RESULTS.GRANTED);
      expect(mockRequest).toHaveBeenCalledWith(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    });

    it('should handle ATT permission denial', async () => {
      const mockRequest = jest.fn().mockResolvedValue(RESULTS.DENIED);
      require('react-native-permissions').request = mockRequest;

      const result = await ComplianceService.requestATTPermission();
      
      expect(result).toBe(RESULTS.DENIED);
    });

    it('should handle ATT permission errors', async () => {
      const mockRequest = jest.fn().mockRejectedValue(new Error('Permission error'));
      require('react-native-permissions').request = mockRequest;

      await expect(ComplianceService.requestATTPermission()).rejects.toThrow('Permission error');
    });
  });

  describe('handleGDPRConsent', () => {
    it('should store GDPR consent', async () => {
      const mockSetItem = jest.fn().mockResolvedValue(undefined);
      (AsyncStorage.setItem as jest.Mock) = mockSetItem;

      await ComplianceService.handleGDPRConsent(true);

      expect(mockSetItem).toHaveBeenCalledWith('gdpr_consent', 'true');
    });

    it('should handle GDPR consent storage errors', async () => {
      const mockSetItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      (AsyncStorage.setItem as jest.Mock) = mockSetItem;

      await expect(ComplianceService.handleGDPRConsent(true)).rejects.toThrow('Storage error');
    });
  });

  describe('isGDPRConsentGiven', () => {
    it('should return true when consent is given', async () => {
      const mockGetItem = jest.fn().mockResolvedValue('true');
      (AsyncStorage.getItem as jest.Mock) = mockGetItem;

      const result = await ComplianceService.isGDPRConsentGiven();

      expect(result).toBe(true);
      expect(mockGetItem).toHaveBeenCalledWith('gdpr_consent');
    });

    it('should return false when consent is not given', async () => {
      const mockGetItem = jest.fn().mockResolvedValue('false');
      (AsyncStorage.getItem as jest.Mock) = mockGetItem;

      const result = await ComplianceService.isGDPRConsentGiven();

      expect(result).toBe(false);
    });

    it('should return false when no consent data exists', async () => {
      const mockGetItem = jest.fn().mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock) = mockGetItem;

      const result = await ComplianceService.isGDPRConsentGiven();

      expect(result).toBe(false);
    });
  });
});