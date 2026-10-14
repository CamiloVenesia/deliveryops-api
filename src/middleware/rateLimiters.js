// src/middleware/rateLimiters.js

import {
    rateLimit
} from 'express-rate-limit';

import { config } from '../config/env.js';

const isTest =
    config.nodeEnv === 'test';

export const apiRateLimiter =
    rateLimit({
        windowMs:
            config.rateLimitWindowMs,

        limit:
            isTest
                ? 10000
                : config.rateLimitMax,

        standardHeaders:
            'draft-7',

        legacyHeaders:
            false,

        message: {
            status: 'error',
            error:
                'TOO_MANY_REQUESTS',
            message:
                'Demasiadas solicitudes. Intentá nuevamente más tarde.'
        }
    });

export const authRateLimiter =
    rateLimit({
        windowMs:
            config.rateLimitWindowMs,

        limit:
            isTest
                ? 10000
                : config.authRateLimitMax,

        standardHeaders:
            'draft-7',

        legacyHeaders:
            false,

        message: {
            status: 'error',
            error:
                'TOO_MANY_REQUESTS',
            message:
                'Demasiados intentos de autenticación. Intentá nuevamente más tarde.'
        }
    });