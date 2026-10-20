
import crypto from 'node:crypto';

import { config } from '../config/env.js';

function deny(res) {
    res.set(
        'WWW-Authenticate',
        'Basic realm="Swagger Docs"'
    );

    return res.status(401).json({
        status: 'error',
        error: 'UNAUTHORIZED',
        message: 'Credenciales inválidas o ausentes'
    });
}

export function basicAuth(req, res, next) {
    const authorization = req.get('authorization') || '';

    // Rechaza formatos incorrectos y cabeceras
    // excesivamente largas.
    if (
        authorization.length > 2048 ||
        !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(authorization)
    ) {
        return deny(res);
    }

    const received = Buffer.from(
        authorization.slice(6),
        'base64'
    ).toString('utf8');

    const expected = [
        config.basicAuthUser,
        config.basicAuthPassword
    ].join(':');

    // Comparación de hashes de longitud fija
    // para reducir filtraciones por tiempo.
    const receivedHash = crypto
        .createHash('sha256')
        .update(received)
        .digest();

    const expectedHash = crypto
        .createHash('sha256')
        .update(expected)
        .digest();

    if (!crypto.timingSafeEqual(
        receivedHash,
        expectedHash
    )) {
        return deny(res);
    }

    return next();
}
