// src/validators/common.schemas.js

import { z } from 'zod';

export const objectIdSchema =
    z
        .string()
        .regex(
            /^[a-fA-F0-9]{24}$/,
            'ID inválido'
        );