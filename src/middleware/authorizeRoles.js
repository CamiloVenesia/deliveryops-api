// src/middleware/authorizeRoles.js

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(
                new customError(
                    ERROR_CODES.UNAUTHORIZED
                )
            );
        }

        if (
            !allowedRoles.includes(
                req.user.role
            )
        ) {
            return next(
                new customError(
                    ERROR_CODES.FORBIDDEN
                )
            );
        }

        return next();
    };
}

export function authorizeSelfOrRoles(
    ...allowedRoles
) {
    return (req, res, next) => {
        if (!req.user) {
            return next(
                new customError(
                    ERROR_CODES.UNAUTHORIZED
                )
            );
        }

        if (
            allowedRoles.includes(
                req.user.role
            )
        ) {
            return next();
        }

        if (
            req.params.uid ===
            req.user.id
        ) {
            return next();
        }

        return next(
            new customError(
                ERROR_CODES.FORBIDDEN
            )
        );
    };
}