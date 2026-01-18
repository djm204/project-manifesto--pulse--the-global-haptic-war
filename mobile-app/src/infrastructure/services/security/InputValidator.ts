import Joi from 'joi';

export interface PulseInputDto {
  type: string;
  intensity: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserRegistrationDto {
  username: string;
  email: string;
  password: string;
  deviceId: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InputValidator {
  private static readonly PULSE_INTENSITY_MIN = 0;
  private static readonly PULSE_INTENSITY_MAX = 100;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  private static readonly PASSWORD_MIN_LENGTH = 8;

  static validatePulseInput(input: any): PulseInputDto {
    const schema = Joi.object({
      type: Joi.string().valid('TAP', 'SWIRL', 'SHATTER').required(),
      intensity: Joi.number()
        .min(this.PULSE_INTENSITY_MIN)
        .max(this.PULSE_INTENSITY_MAX)
        .required(),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
      }).optional()
    });
    
    const { error, value } = schema.validate(input);
    if (error) {
      throw new ValidationError(`Invalid pulse input: ${error.message}`);
    }
    return value;
  }

  static validateUserRegistration(input: any): UserRegistrationDto {
    const schema = Joi.object({
      username: Joi.string()
        .pattern(this.USERNAME_REGEX)
        .required()
        .messages({
          'string.pattern.base': 'Username must be 3-20 characters, alphanumeric and underscore only'
        }),
      email: Joi.string().email().required(),
      password: Joi.string()
        .min(this.PASSWORD_MIN_LENGTH)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
        }),
      deviceId: Joi.string().uuid().required()
    });
    
    const { error, value } = schema.validate(input);
    if (error) {
      throw new ValidationError(`Invalid registration data: ${error.message}`);
    }
    return value;
  }

  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }

  static validateSessionToken(token: string): boolean {
    const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    return tokenRegex.test(token) && token.length > 20;
  }
}