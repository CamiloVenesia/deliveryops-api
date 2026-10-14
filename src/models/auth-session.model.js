// src/models/auth-session.model.js

import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            select: false
        },

        jti: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        revokedAt: {
            type: Date,
            default: null,
            index: true
        },

        replacedBySession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthSession',
            default: null
        },

        userAgent: {
            type: String,
            default: null,
            trim: true
        },

        ipAddress: {
            type: String,
            default: null,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

authSessionSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0
    }
);

const AuthSession = mongoose.model(
    'AuthSession',
    authSessionSchema
);

export default AuthSession;