// src/config/env.js

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = ['PORT', 'MONGO_URL', 'NODE_ENV'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error(
        `[FATAL] Faltan variables de entorno obligatorias: ${missing.join(', ')}`
    );
    console.error(
        'Revisá tu archivo .env (podés basarte en .env.example)'
    );
    process.exit(1);
}

export const config = {
    port: process.env.PORT,
    mongoUrl: process.env.MONGO_URL,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || 'info',
    basicAuthUser: process.env.BASIC_AUTH_USER || 'dev',
    basicAuthPassword:
        process.env.BASIC_AUTH_PASSWORD || 'deliveryops123'
};