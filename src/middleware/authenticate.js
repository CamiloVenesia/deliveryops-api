// src/middleware/authenticate.js

import { verifyAccessToken } from '../utils/token.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export function authenticate(
    req,
    res,
    next
) {
    const authorization =
        req.get('authorization');

    if (
        !authorization ||
        !authorization.startsWith(
            'Bearer '
        )
    ) {
        return next(
            new customError(
                ERROR_CODES.UNAUTHORIZED
            )
        );
    }

    const token =
        authorization.slice(7);

    try {
        const payload =
            verifyAccessToken(token);

        req.user = {
            id: payload.sub,
            role: payload.role
        };

        return next();
    } catch {
        return next(
            new customError(
                ERROR_CODES.INVALID_ACCESS_TOKEN
            )
        );
    }
}