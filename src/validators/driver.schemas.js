
import { z } from 'zod';

import {
    DRIVER_AVAILABILITY_STATUSES
} from '../constants/logistics.constants.js';

import {
    objectIdSchema
} from './common.schemas.js';

export const driverIdParamsSchema = z.object({
    did: objectIdSchema
});

export const updateDriverAvailabilitySchema = z.object({
    status: z.enum(DRIVER_AVAILABILITY_STATUSES)
});

export const updateDriverCapacitySchema = z.object({
    maxConcurrentDeliveries: z
        .number()
        .int()
        .min(1)
        .max(50)
});
