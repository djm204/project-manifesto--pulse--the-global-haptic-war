import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
});

export const PulseSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  startTime: z.number().positive(),
  score: z.number().min(0).max(10000),
  accuracy: z.number().min(0).max(1),
  pattern: z.object({
    type: z.enum(['tap', 'swirl', 'shatter']),
    intensity: z.number().min(0).max(1),
    duration: z.number().positive()
  })
});

export const APIRequestSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timestamp: z.number().positive()
});

export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const sanitizeString = (input: string): string => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/[<>&"']/g, (char) => {
                const entities: Record<string, string> = {
                  '<': '&lt;',
                  '>': '&gt;',
                  '&': '&amp;',
                  '"': '&quot;',
                  "'": '&#x27;'
                };
                return entities[char] || char;
              });
};

export const isValidEmail = (email: string): boolean => {
  return UserSchema.shape.email.safeParse(email).success;
};

export const isValidUsername = (username: string): boolean => {
  return UserSchema.shape.username.safeParse(username).success;
};