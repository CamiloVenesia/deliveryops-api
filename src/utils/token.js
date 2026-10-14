// src/utils/token.js

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { config } from '../config/env.js';

export function generateAccessToken(
    user
) {
    return jwt.sign(
        {
            role: user.role,
            type: 'access'
        },
        config.jwtAccessSecret,
        {
            subject:
                user._id.toString(),

            jwtid:
                crypto.randomUUID(),

            expiresIn:
                config.jwtAccessExpiresIn
        }
    );
}

export function generateRefreshToken(
    user
) {
    const jti =
        crypto.randomUUID();

    const token =
        jwt.sign(
            {
                type: 'refresh'
            },
            config.jwtRefreshSecret,
            {
                subject:
                    user._id.toString(),

                jwtid:
                    jti,

                expiresIn:
                    config.jwtRefreshExpiresIn
            }
        );

    const decoded =
        jwt.decode(token);

    const expiresAt =
        new Date(
            decoded.exp * 1000
        );

    return {
        token,
        jti,
        expiresAt
    };
}

export function verifyAccessToken(
    token
) {
    const payload =
        jwt.verify(
            token,
            config.jwtAccessSecret
        );

    if (
        payload.type !== 'access'
    ) {
        throw new jwt.JsonWebTokenError(
            'Tipo de token inválido'
        );
    }

    return payload;
}

export function verifyRefreshToken(
    token
) {
    const payload =
        jwt.verify(
            token,
            config.jwtRefreshSecret
        );

    if (
        payload.type !== 'refresh'
    ) {
        throw new jwt.JsonWebTokenError(
            'Tipo de token inválido'
        );
    }

    return payload;
}

export function hashToken(
    token
) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}