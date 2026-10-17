
import { z } from 'zod';

import {
  DELIVERY_ATTEMPT_OUTCOMES
} from '../constants/logistics.constants.js';

export const registerDeliveryAttemptSchema = z.object({
  outcome: z.enum(DELIVERY_ATTEMPT_OUTCOMES),

  notes: z.string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),

  latitude: z.number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),

  longitude: z.number()
    .min(-180)
    .max(180)
    .nullable()
    .optional()
}).strict();
