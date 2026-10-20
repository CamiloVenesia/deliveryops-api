
import { randomUUID } from 'node:crypto';

import AssignmentLease from '../models/assignment-lease.model.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

// El alquiler previene colisiones entre solicitudes concurrentes.
// Su duración máxima limita bloqueos huérfanos por caídas del proceso.
const LEASE_MS = 120_000;

async function acquire(key, token) {
    const expiresAt = new Date(Date.now() + LEASE_MS);

    try {
        await AssignmentLease.create({
            _id: key,
            token,
            expiresAt
        });

        return;
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
    }

    // La actualización condicional permite recuperar un alquiler caducado.
    // Si otro proceso lo posee todavía, rechazamos esta asignación.
    const recovered = await AssignmentLease.findOneAndUpdate(
        {
            _id: key,
            expiresAt: { $lte: new Date() }
        },
        {
            $set: { token, expiresAt }
        },
        { new: true }
    );

    if (!recovered || recovered.token !== token) {
        throw new customError(
            ERROR_CODES.DRIVER_UNAVAILABLE,
            'Hay otra asignación en curso. Volvé a intentarlo en unos segundos.'
        );
    }
}

export const assignmentLeaseService = {
    async run({ orderId, driverId }, operation) {
        const token = randomUUID();

        const keys = [
            `driver:${driverId}`,
            `order:${orderId}`
        ].sort();

        const acquired = [];

        try {
            for (const key of keys) {
                await acquire(key, token);
                acquired.push(key);
            }

            return await operation();
        } finally {
            // Nunca liberar un alquiler que haya tomado otro proceso.
            await Promise.all(
                acquired.map(key =>
                    AssignmentLease.deleteOne({
                        _id: key,
                        token
                    })
                )
            );
        }
    }
};
