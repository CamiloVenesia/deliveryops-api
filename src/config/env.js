// src/config/env.js

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
    'PORT',
    'MONGO_URL',
    'NODE_ENV',
    'BASIC_AUTH_USER',
    'BASIC_AUTH_PASSWORD',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN'
];

const missing = REQUIRED_VARS.filter(
    (key) => !process.env[key]
);

if (missing.length > 0) {
    console.error(
        `[FATAL] Faltan variables de entorno obligatorias: ${missing.join(', ')}`
    );

    console.error(
        'Revisá tu archivo .env (podés basarte en .env.example)'
    );

    process.exit(1);
}

if (
    process.env.JWT_ACCESS_SECRET ===
    process.env.JWT_REFRESH_SECRET
) {
    console.error(
        '[FATAL] JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser diferentes'
    );

    process.exit(1);
}

export const config = {
    port:
        process.env.PORT,

    mongoUrl:
        process.env.MONGO_URL,

    nodeEnv:
        process.env.NODE_ENV,

    logLevel:
        process.env.LOG_LEVEL || 'info',

    basicAuthUser:
        process.env.BASIC_AUTH_USER,

    basicAuthPassword:
        process.env.BASIC_AUTH_PASSWORD,

    jwtAccessSecret:
        process.env.JWT_ACCESS_SECRET,

    jwtRefreshSecret:
        process.env.JWT_REFRESH_SECRET,

    jwtAccessExpiresIn:
        process.env.JWT_ACCESS_EXPIRES_IN,

    jwtRefreshExpiresIn:
        process.env.JWT_REFRESH_EXPIRES_IN
};