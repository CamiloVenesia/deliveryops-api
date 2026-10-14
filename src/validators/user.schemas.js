// src/validators/user.schemas.js

import { z } from 'zod';

import {
    objectIdSchema
} from './common.schemas.js';

export const createUserSchema =
    z.object({
        firstName:
            z
                .string()
                .trim()
                .min(
                    1,
                    'El nombre es obligatorio'
                )
                .max(
                    100,
                    'El nombre es demasiado largo'
                ),

        lastName:
            z
                .string()
                .trim()
                .min(
                    1,
                    'El apellido es obligatorio'
                )
                .max(
                    100,
                    'El apellido es demasiado largo'
                ),

        email:
            z
                .string()
                .trim()
                .email(
                    'Email inválido'
                )
                .toLowerCase(),

        password:
            z
                .string()
                .min(
                    8,
                    'La contraseña debe tener al menos 8 caracteres'
                )
                .max(
                    128,
                    'La contraseña es demasiado larga'
                ),

        role:
            z
                .enum([
                    'admin',
                    'customer',
                    'driver',
                    'store'
                ])
                .optional()
    });

export const userIdParamsSchema =
    z.object({
        uid:
            objectIdSchema
    });