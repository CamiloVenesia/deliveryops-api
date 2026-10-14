// src/repositories/auth.repository.js

import AuthSession from '../models/auth-session.model.js';

export const authRepository = {

    async createSession({
        userId,
        tokenHash,
        jti,
        expiresAt,
        userAgent = null,
        ipAddress = null
    }) {
        return await AuthSession.create({
            user: userId,
            tokenHash,
            jti,
            expiresAt,
            userAgent,
            ipAddress
        });
    },

    async findByTokenHash(tokenHash) {
        return await AuthSession
            .findOne({
                tokenHash
            })
            .select('+tokenHash');
    },

    async findActiveByTokenHash(
        tokenHash
    ) {
        return await AuthSession
            .findOne({
                tokenHash,
                revokedAt: null,
                expiresAt: {
                    $gt: new Date()
                }
            })
            .select('+tokenHash');
    },

    async findByJti(jti) {
        return await AuthSession
            .findOne({
                jti
            })
            .select('+tokenHash');
    },

    async revokeSession(
        sessionId,
        replacedBySessionId = null
    ) {
        return await AuthSession
            .findByIdAndUpdate(
                sessionId,
                {
                    revokedAt:
                        new Date(),

                    replacedBySession:
                        replacedBySessionId
                },
                {
                    new: true
                }
            );
    },

    async revokeAllUserSessions(
        userId
    ) {
        return await AuthSession.updateMany(
            {
                user: userId,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt:
                        new Date()
                }
            }
        );
    },

    async deleteExpiredSessions() {
        return await AuthSession.deleteMany({
            expiresAt: {
                $lte: new Date()
            }
        });
    }
};