// src/validators/order.schemas.js

import { z } from 'zod';

import {
    objectIdSchema
} from './common.schemas.js';

const orderItemSchema =
    z.object({
        name:
            z
                .string()
                .trim()
                .min(
                    1,
                    'El nombre del producto es obligatorio'
                ),

        quantity:
            z
                .number()
                .int(
                    'La cantidad debe ser un número entero'
                )
                .positive(
                    'La cantidad debe ser mayor a cero'
                ),

        price:
            z
                .number()
                .nonnegative(
                    'El precio no puede ser negativo'
                )
    });

export const createOrderSchema =
    z.object({
        customer:
            objectIdSchema
                .optional(),

        items:
            z
                .array(
                    orderItemSchema
                )
                .min(
                    1,
                    'El pedido debe tener al menos un item'
                ),

        deliveryAddress:
            z
                .string()
                .trim()
                .min(
                    3,
                    'La dirección de entrega es obligatoria'
                ),

        priority:
            z
                .enum([
                    'low',
                    'normal',
                    'high'
                ])
                .optional()
    });

export const updateOrderStatusSchema =
    z.object({
        status:
            z.enum([
                'created',
                'assigned',
                'picked_up',
                'in_transit',
                'delivered',
                'cancelled'
            ])
    });

export const orderIdParamsSchema =
    z.object({
        oid:
            objectIdSchema
    });