// src/services/auth.service.js

import bcrypt from 'bcrypt';

import { userRepository } from '../repositories/user.repository.js';
import { authRepository } from '../repositories/auth.repository.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken
} from '../utils/token.js';

export const authService = {

    async login({
        email,
        password,
        userAgent = null,
        ipAddress = null
    }) {
        if (!email || !password) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Email y contraseña son obligatorios'
            );
        }

        const user =
            await userRepository.findByEmailWithPassword(
                email.toLowerCase()
            );

        if (!user) {
            throw new customError(
                ERROR_CODES.INVALID_CREDENTIALS
            );
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            throw new customError(
                ERROR_CODES.INVALID_CREDENTIALS
            );
        }

        const accessToken =
            generateAccessToken(user);

        const {
            token: refreshToken,
            jti,
            expiresAt
        } = generateRefreshToken(user);

        await authRepository.createSession({
            userId: user._id,
            tokenHash:
                hashToken(refreshToken),
            jti,
            expiresAt,
            userAgent,
            ipAddress
        });

        return {
            user: user.toObject(),
            accessToken,
            refreshToken,
            refreshExpiresAt: expiresAt
        };
    },

    async refresh({
        refreshToken,
        userAgent = null,
        ipAddress = null
    }) {
        if (!refreshToken) {
            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        let payload;

        try {
            payload =
                verifyRefreshToken(
                    refreshToken
                );
        } catch {
            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        const tokenHash =
            hashToken(refreshToken);

        const session =
            await authRepository.findByTokenHash(
                tokenHash
            );

        if (!session) {
            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        if (session.revokedAt) {
            await authRepository
                .revokeAllUserSessions(
                    session.user
                );

            throw new customError(
                ERROR_CODES.REFRESH_TOKEN_REUSED
            );
        }

        if (
            session.expiresAt <=
            new Date()
        ) {
            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        if (
            payload.jti !==
                session.jti ||
            payload.sub !==
                session.user.toString()
        ) {
            await authRepository
                .revokeAllUserSessions(
                    session.user
                );

            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        const user =
            await userRepository.findById(
                payload.sub
            );

        if (!user) {
            await authRepository
                .revokeAllUserSessions(
                    session.user
                );

            throw new customError(
                ERROR_CODES.INVALID_REFRESH_TOKEN
            );
        }

        const accessToken =
            generateAccessToken(user);

        const {
            token: newRefreshToken,
            jti,
            expiresAt
        } = generateRefreshToken(user);

        const newSession =
            await authRepository.createSession({
                userId: user._id,
                tokenHash:
                    hashToken(
                        newRefreshToken
                    ),
                jti,
                expiresAt,
                userAgent,
                ipAddress
            });

        await authRepository.revokeSession(
            session._id,
            newSession._id
        );

        return {
            accessToken,
            refreshToken:
                newRefreshToken,
            refreshExpiresAt:
                expiresAt
        };
    },

    async logout(refreshToken) {
        if (!refreshToken) {
            return;
        }

        const tokenHash =
            hashToken(refreshToken);

        const session =
            await authRepository.findByTokenHash(
                tokenHash
            );

        if (
            session &&
            !session.revokedAt
        ) {
            await authRepository
                .revokeSession(
                    session._id
                );
        }
    },

    async logoutAll(userId) {
        await authRepository
            .revokeAllUserSessions(
                userId
            );
    },

    async getCurrentUser(userId) {
        const user =
            await userRepository.findById(
                userId
            );

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        return user;
    }
};