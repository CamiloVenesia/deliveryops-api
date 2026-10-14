// src/validators/auth.schemas.js

import { z } from 'zod';

export const loginSchema =
    z.object({
        email:
            z
                .string({
                    message:
                        'El email es obligatorio'
                })
                .trim()
                .email(
                    'Email inválido'
                )
                .toLowerCase(),

        password:
            z
                .string({
                    message:
                        'La contraseña es obligatoria'
                })
                .min(
                    1,
                    'La contraseña es obligatoria'
                )
    });