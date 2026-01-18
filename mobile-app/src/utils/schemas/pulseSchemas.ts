import Joi from 'joi';
import { PulseData, PulseSession, PulseResult } from '../../types/pulse';
import { InputValidator } from '../services/security/InputValidator';

// Base validation patterns
const VALIDATION_PATTERNS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  timestamp: /^\d{13}$/, // Unix timestamp in milliseconds
  score: /^[0-9]{1,8}$/, // Max 8 digits for score
  deviceId: /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  countryCode: /^[A-Z]{2}$/, // ISO 3166-1 alpha-2
  version: /^\d+\.\d+\.\d+$/ // Semantic versioning
};

// Custom Joi extensions for enhanced security
const customJoi = Joi.extend({
  type: 'secureString',
  base: Joi.string(),
  messages: {
    'secureString.xss': 'Input contains potentially malicious content',
    'secureString.sqlInjection': 'Input contains SQL injection patterns'
  },
  rules: {
    noXSS: {
      validate(value: string, helpers: any) {
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe/gi,
          /<object/gi,
          /<embed/gi
        ];
        
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            return helpers.error('secureString.xss');
          }
        }
        return value;
      }
    },
    noSQLInjection: {
      validate(value: string, helpers: any) {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
          /(--|\/\*|\*\/|;)/g,
          /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
        ];
        
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return helpers.error('secureString.sqlInjection');
          }
        }
        return value;
      }
    }
  }
});

// Pulse Data Schema
export const pulseDataSchema = Joi.object<PulseData>({
  id: Joi.string()
    .pattern(VALIDATION_PATTERNS.uuid)
    .required()
    .messages({
      'string.pattern.base': 'Pulse ID must be a valid UUID format'
    }),
  
  userId: customJoi.secureString()
    .pattern(VALIDATION_PATTERNS.uuid)
    .noXSS()
    .noSQLInjection()
    .required()
    .messages({
      'string.pattern.base': 'User ID must be a valid UUID format'
    }),
  
  deviceId: customJoi.secureString()
    .pattern(VALIDATION_PATTERNS.deviceId)
    .noXSS()
    .noSQLInjection()
    .required()
    .messages({
      'string.pattern.base': 'Device ID must be a valid UUID format'
    }),
  
  timestamp: Joi.number()
    .integer()
    .min(1609459200000) // Jan 1, 2021
    .max(() => Date.now() + 86400000) // Max 24 hours in future
    .required()
    .messages({
      'number.min': 'Timestamp cannot be before January 1, 2021',
      'number.max': 'Timestamp cannot be more than 24 hours in the future'
    }),
  
  globalPulseTime: Joi.number()
    .integer()
    .min(1609459200000)
    .max(() => Date.now() + 86400000)
    .required(),
  
  userTapTime: Joi.number()
    .integer()
    .min(1609459200000)
    .max(() => Date.now() + 1000) // Max 1 second in future for tap time
    .required(),
  
  accuracy: Joi.number()
    .min(-10000) // -10 seconds max early
    .max(10000)  // +10 seconds max late
    .required()
    .messages({
      'number.min': 'Accuracy cannot be more than 10 seconds early',
      'number.max': 'Accuracy cannot be more than 10 seconds late'
    }),
  
  score: Joi.number()
    .integer()
    .min(0)
    .max(99999999) // Max 8 digits
    .required()
    .messages({
      'number.max': 'Score cannot exceed 99,999,999'
    }),
  
  location: Joi.object({
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .precision(6) // ~11cm precision
      .optional(),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .precision(6)
      .optional(),
    countryCode: Joi.string()
      .pattern(VALIDATION_PATTERNS.countryCode)
      .optional()
  }).optional(),
  
  metadata: Joi.object({
    appVersion: Joi.string()
      .pattern(VALIDATION_PATTERNS.version)
      .max(20)
      .required(),
    platform: Joi.string()
      .valid('ios', 'android')
      .required(),
    deviceModel: customJoi.secureString()
      .noXSS()
      .noSQLInjection()
      .max(50)
      .optional(),
    osVersion: Joi.string()
      .max(20)
      .optional()
  }).required()
}).options({
  stripUnknown: true, // Remove unknown fields for security
  abortEarly: false   // Return all validation errors
});

// Pulse Session Schema
export const pulseSessionSchema = Joi.object<PulseSession>({
  sessionId: Joi.string()
    .pattern(VALIDATION_PATTERNS.uuid)
    .required(),
  
  userId: customJoi.secureString()
    .pattern(VALIDATION_PATTERNS.uuid)
    .noXSS()
    .noSQLInjection()
    .required(),
  
  startTime: Joi.number()
    .integer()
    .min(1609459200000)
    .max(() => Date.now())
    .required(),
  
  endTime: Joi.number()
    .integer()
    .min(Joi.ref('startTime'))
    .max(() => Date.now() + 3600000) // Max 1 hour session
    .optional(),
  
  pulseCount: Joi.number()
    .integer()
    .min(0)
    .max(100) // Max 100 pulses per session
    .default(0),
  
  totalScore: Joi.number()
    .integer()
    .min(0)
    .max(999999999) // Max 9 digits total
    .default(0),
  
  averageAccuracy: Joi.number()
    .min(-10000)
    .max(10000)
    .optional(),
  
  status: Joi.string()
    .valid('active', 'completed', 'abandoned')
    .default('active'),
  
  adWatched: Joi.boolean()
    .default(false),
  
  rewardClaimed: Joi.boolean()
    .default(false)
}).options({
  stripUnknown: true,
  abortEarly: false
});

// Pulse Result Schema for API responses
export const pulseResultSchema = Joi.object<PulseResult>({
  success: Joi.boolean().required(),
  
  data: Joi.when('success', {
    is: true,
    then: Joi.object({
      rank: Joi.number()
        .integer()
        .min(1)
        .max(1000000) // Max 1M users
        .required(),
      
      percentile: Joi.number()
        .min(0)
        .max(100)
        .precision(2)
        .required(),
      
      globalStats: Joi.object({
        totalParticipants: Joi.number()
          .integer()
          .min(0)
          .required(),
        averageAccuracy: Joi.number()
          .min(-10000)
          .max(10000)
          .required(),
        bestAccuracy: Joi.number()
          .min(-10000)
          .max(10000)
          .required()
      }).required(),
      
      rewards: Joi.object({
        points: Joi.number()
          .integer()
          .min(0)
          .max(10000)
          .required(),
        multiplier: Joi.number()
          .min(1)
          .max(10)
          .precision(2)
          .default(1),
        bonusAvailable: Joi.boolean()
          .default(false)
      }).optional()
    }).required(),
    
    otherwise: Joi.forbidden()
  }),
  
  error: Joi.when('success', {
    is: false,
    then: Joi.object({
      code: Joi.string()
        .valid(
          'VALIDATION_ERROR',
          'NETWORK_ERROR', 
          'SERVER_ERROR',
          'RATE_LIMITED',
          'UNAUTHORIZED',
          'PULSE_EXPIRED'
        )
        .required(),
      
      message: customJoi.secureString()
        .noXSS()
        .noSQLInjection()
        .max(200)
        .required(),
      
      details: Joi.object().optional()
    }).required(),
    
    otherwise: Joi.forbidden()
  }),
  
  timestamp: Joi.number()
    .integer()
    .min(1609459200000)
    .max(() => Date.now() + 1000)
    .required()
}).options({
  stripUnknown: true,
  abortEarly: false
});

// Batch validation schema for multiple pulse data
export const batchPulseDataSchema = Joi.object({
  pulses: Joi.array()
    .items(pulseDataSchema)
    .min(1)
    .max(50) // Max 50 pulses per batch for performance
    .required()
    .messages({
      'array.max': 'Cannot process more than 50 pulses per batch'
    }),
  
  batchId: Joi.string()
    .pattern(VALIDATION_PATTERNS.uuid)
    .required(),
  
  checksum: Joi.string()
    .length(64) // SHA-256 hex string
    .pattern(/^[a-f0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Checksum must be a valid SHA-256 hash'
    })
}).options({
  stripUnknown: true,
  abortEarly: false
});

// Schema validation helper with enhanced error handling
export class SchemaValidator {
  static validatePulseData(data: unknown): { 
    isValid: boolean; 
    data?: PulseData; 
    errors?: string[] 
  } {
    try {
      const { error, value } = pulseDataSchema.validate(data);
      
      if (error) {
        const errors = error.details.map(detail => detail.message);
        return { isValid: false, errors };
      }
      
      return { isValid: true, data: value };
    } catch (err) {
      return { 
        isValid: false, 
        errors: ['Validation failed due to unexpected error'] 
      };
    }
  }
  
  static validatePulseSession(data: unknown): {
    isValid: boolean;
    data?: PulseSession;
    errors?: string[]
  } {
    try {
      const { error, value } = pulseSessionSchema.validate(data);
      
      if (error) {
        const errors = error.details.map(detail => detail.message);
        return { isValid: false, errors };
      }
      
      return { isValid: true, data: value };
    } catch (err) {
      return {
        isValid: false,
        errors: ['Session validation failed due to unexpected error']
      };
    }
  }
  
  static validateBatchPulseData(data: unknown): {
    isValid: boolean;
    data?: { pulses: PulseData[]; batchId: string; checksum: string };
    errors?: string[]
  } {
    try {
      const { error, value } = batchPulseDataSchema.validate(data);
      
      if (error) {
        const errors = error.details.map(detail => detail.message);
        return { isValid: false, errors };
      }
      
      // Verify checksum integrity
      const calculatedChecksum = this.calculateBatchChecksum(value.pulses);
      if (calculatedChecksum !== value.checksum) {
        return {
          isValid: false,
          errors: ['Batch checksum verification failed']
        };
      }
      
      return { isValid: true, data: value };
    } catch (err) {
      return {
        isValid: false,
        errors: ['Batch validation failed due to unexpected error']
      };
    }
  }
  
  private static calculateBatchChecksum(pulses: PulseData[]): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(pulses, Object.keys(pulses).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
}