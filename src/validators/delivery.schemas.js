import {
    z
} from 'zod';

import {
    objectIdSchema
} from './common.schemas.js';

import {
    DELIVERY_STATUSES
} from '../constants/status.constants.js';

export const createDeliverySchema =
    z.object({
        order:
            objectIdSchema,

        driver:
            objectIdSchema,

        priority:
            z
                .enum([
                    'low',
                    'normal',
                    'high'
                ])
                .optional()
    });

export const updateDeliveryStatusSchema =
    z.object({
        status:
            z.enum(
                DELIVERY_STATUSES
            )
    });

export const deliveryIdParamsSchema =
    z.object({
        did:
            objectIdSchema
    });