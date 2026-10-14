// src/middleware/validate.js

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function buildValidationMessage(
    issues
) {
    return issues
        .map((issue) => {
            const path =
                issue.path.length > 0
                    ? issue.path.join('.')
                    : 'request';

            return `${path}: ${issue.message}`;
        })
        .join(' | ');
}

export function validateBody(
    schema
) {
    return (
        req,
        res,
        next
    ) => {
        const result =
            schema.safeParse(
                req.body
            );

        if (!result.success) {
            return next(
                new customError(
                    ERROR_CODES.VALIDATION_ERROR,
                    buildValidationMessage(
                        result.error.issues
                    )
                )
            );
        }

        req.body =
            result.data;

        return next();
    };
}

export function validateParams(
    schema
) {
    return (
        req,
        res,
        next
    ) => {
        const result =
            schema.safeParse(
                req.params
            );

        if (!result.success) {
            return next(
                new customError(
                    ERROR_CODES.VALIDATION_ERROR,
                    buildValidationMessage(
                        result.error.issues
                    )
                )
            );
        }

        req.params =
            result.data;

        return next();
    };
}