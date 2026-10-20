
import mongoose from 'mongoose';

import User from '../models/user.model.js';
import { verifyAccessToken } from '../utils/token.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function invalidAccess(next) {
    return next(
        new customError(ERROR_CODES.INVALID_ACCESS_TOKEN)
    );
}

export async function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer ([^\s]+)$/.exec(authorization);

    if (!match) {
        return next(
            new customError(ERROR_CODES.UNAUTHORIZED)
        );
    }

    let payload;

    try {
        payload = verifyAccessToken(match[1]);
    } catch {
        return invalidAccess(next);
    }

    if (!mongoose.isValidObjectId(payload.sub)) {
        return invalidAccess(next);
    }

    try {
        const user = await User.findById(payload.sub)
            .select('role active')
            .lean();

        if (!user || user.active === false) {
            return invalidAccess(next);
        }

        // Los permisos se determinan desde MongoDB,
        // no desde el rol antiguo contenido en el JWT.
        req.user = {
            id: String(user._id),
            role: user.role
        };

        // Evita almacenar respuestas privadas
        // en cachés HTTP compartidas.
        res.set('Cache-Control', 'no-store');

        return next();
    } catch (error) {
        // Un fallo de base de datos no debe
        // confundirse con un token inválido.
        return next(error);
    }
}
