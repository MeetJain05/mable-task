import { z } from 'zod';
import { EVENT_TYPES } from '../types/events';

// Validate individual condition requirements at the HTTP boundary
export const audienceConditionSchema = z.object({
  eventType: z.enum(EVENT_TYPES, {
    message: `Invalid event type. Supported: ${EVENT_TYPES.join(', ')}`,
  }),
  operator: z.enum(['at_least', 'exactly'], {
    message: 'Invalid operator. Supported: at_least, exactly',
  }),
  count: z
    .number({ message: 'Count must be a number' })
    .int('Count must be an integer')
    .min(0, 'Count must be greater than or equal to 0'),
  withinDays: z
    .number({ message: 'withinDays must be a number' })
    .int('withinDays must be an integer')
    .positive('withinDays must be a positive integer'),
});

export const audiencePreviewSchema = z.object({
  name: z.string({ message: 'Audience name is required' }).trim().min(1, 'Audience name is required'),
  asOf: z.string({ message: 'asOf timestamp is required' }).datetime({ message: 'asOf must be a valid ISO 8601 timestamp' }),
  conditions: z
    .array(audienceConditionSchema, { message: 'conditions must be an array' })
    .min(1, 'At least one condition is required'),
});

export type AudiencePreviewInput = z.infer<typeof audiencePreviewSchema>;
