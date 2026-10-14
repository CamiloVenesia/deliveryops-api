// src/controllers/auth.controller.js

import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';

const REFRESH_COOKIE_NAME =
    'deliveryops_refresh';

function getCookieOptions() {
    const isProduction =
        config.nodeEnv === 'production';

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite:
            isProduction
                ? 'none'
                : 'lax',
        path: '/api/auth'
    };
}

export const authController = {

    async login(req, res) {
        const result =
            await authService.login({
                email: req.body.email,
                password: req.body.password,
                userAgent:
                    req.get('user-agent') ||
                    null,
                ipAddress:
                    req.ip || null
            });

        res.cookie(
            REFRESH_COOKIE_NAME,
            result.refreshToken,
            {
                ...getCookieOptions(),
                expires:
                    result.refreshExpiresAt
            }
        );

        res.status(200).json({
            user: result.user,
            accessToken:
                result.accessToken
        });
    },

    async refresh(req, res) {
        const refreshToken =
            req.cookies[
                REFRESH_COOKIE_NAME
            ];

        const result =
            await authService.refresh({
                refreshToken,
                userAgent:
                    req.get('user-agent') ||
                    null,
                ipAddress:
                    req.ip || null
            });

        res.cookie(
            REFRESH_COOKIE_NAME,
            result.refreshToken,
            {
                ...getCookieOptions(),
                expires:
                    result.refreshExpiresAt
            }
        );

        res.status(200).json({
            accessToken:
                result.accessToken
        });
    },

    async logout(req, res) {
        const refreshToken =
            req.cookies[
                REFRESH_COOKIE_NAME
            ];

        await authService.logout(
            refreshToken
        );

        res.clearCookie(
            REFRESH_COOKIE_NAME,
            getCookieOptions()
        );

        res.status(200).json({
            message:
                'Sesión cerrada correctamente'
        });
    },

    async me(req, res) {
        const user =
            await authService.getCurrentUser(
                req.user.id
            );

        res.status(200).json(user);
    }
};