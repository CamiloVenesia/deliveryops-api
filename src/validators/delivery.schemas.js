// src/validators/delivery.schemas.js

import { z } from 'zod';

import {
    objectIdSchema
} from './common.schemas.js';

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
            z.enum([
                'pending',
                'assigned',
                'in_transit',
                'delivered'
            ])
    });

export const deliveryIdParamsSchema =
    z.object({
        did:
            objectIdSchema
    });