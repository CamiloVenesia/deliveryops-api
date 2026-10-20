
import mongoose from 'mongoose';

import User from '../models/user.model.js';
import Delivery from '../models/delivery.model.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const DEFAULT_CAPACITY = 12;
const MAX_CAPACITY = 50;
const ACTIVE_STATUSES = ['pending', 'assigned', 'in_transit'];
const DAY = 24 * 60 * 60 * 1000;

function invalid(message) {
    throw new customError(ERROR_CODES.VALIDATION_ERROR, message);
}

function validateId(id) {
    if (!mongoose.isValidObjectId(id)) {
        invalid('ID de repartidor inválido');
    }
}

function positiveInteger(value, fallback, maximum) {
    if (value === undefined) return fallback;

    const number = Number(value);

    if (
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > maximum
    ) {
        invalid(`El valor debe ser un número entero entre 1 y ${maximum}`);
    }

    return number;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkAccess(id, actor) {
    if (
        actor.role !== 'admin' &&
        (
            actor.role !== 'driver' ||
            String(actor.id) !== String(id)
        )
    ) {
        throw new customError(ERROR_CODES.FORBIDDEN);
    }
}

function capacityOf(user) {
    const value = user.driverProfile?.maxConcurrentDeliveries;

    return Number.isInteger(value) &&
        value >= 1 &&
        value <= MAX_CAPACITY
        ? value
        : DEFAULT_CAPACITY;
}

function declaredStatusOf(user) {
    return user.driverProfile?.availabilityStatus ?? 'available';
}

function profileUpdate(user, changes) {
    return {
        ...(user.driverProfile?.toObject?.() ?? {}),
        availabilityStatus: declaredStatusOf(user),
        maxConcurrentDeliveries: capacityOf(user),
        ...changes
    };
}

async function activeCount(driverId) {
    return Delivery.countDocuments({
        driver: driverId,
        status: { $in: ACTIVE_STATUSES }
    });
}

async function summarize(users, days) {
    if (!users.length) return [];

    const ids = users.map(user => user._id);
    const from = new Date(Date.now() - days * DAY);

    const [activeRows, completedRows] = await Promise.all([
        Delivery.aggregate([
            {
                $match: {
                    driver: { $in: ids },
                    status: { $in: ACTIVE_STATUSES }
                }
            },
            {
                $group: {
                    _id: '$driver',
                    count: { $sum: 1 }
                }
            }
        ]),
        Delivery.aggregate([
            {
                $match: {
                    driver: { $in: ids },
                    status: 'delivered',
                    deliveredAt: { $gte: from }
                }
            },
            {
                $group: {
                    _id: '$driver',
                    completed: { $sum: 1 },
                    averageMinutes: {
                        $avg: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$assignedAt', null] },
                                        { $ne: ['$deliveredAt', null] },
                                        { $gte: ['$deliveredAt', '$assignedAt'] }
                                    ]
                                },
                                {
                                    $divide: [
                                        {
                                            $subtract: [
                                                '$deliveredAt',
                                                '$assignedAt'
                                            ]
                                        },
                                        60000
                                    ]
                                },
                                null
                            ]
                        }
                    }
                }
            }
        ])
    ]);

    const activeMap = new Map(
        activeRows.map(row => [String(row._id), row.count])
    );

    const completedMap = new Map(
        completedRows.map(row => [String(row._id), row])
    );

    return users.map(user => {
        const id = String(user._id);
        const activeDeliveries = activeMap.get(id) ?? 0;
        const completed = completedMap.get(id);
        const maxConcurrentDeliveries = capacityOf(user);

        const remainingCapacity = Math.max(
            0,
            maxConcurrentDeliveries - activeDeliveries
        );

        const declaredStatus = declaredStatusOf(user);

        const effectiveStatus =
            !user.active || declaredStatus === 'offline'
                ? 'offline'
                : declaredStatus === 'busy' || remainingCapacity === 0
                    ? 'busy'
                    : 'available';

        const utilizationPercent = Number(
            (
                activeDeliveries /
                maxConcurrentDeliveries * 100
            ).toFixed(1)
        );

        return {
            id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            active: user.active,
            driverProfile: user.driverProfile ?? null,
            configured: Boolean(user.driverProfile),
            declaredStatus,
            effectiveStatus,
            eligibleForAssignment: effectiveStatus === 'available',
            maxConcurrentDeliveries,
            remainingCapacity,
            utilizationPercent,
            capacityReached: remainingCapacity === 0,
            metrics: {
                activeDeliveries,
                completedInPeriod: completed?.completed ?? 0,
                averageDeliveryMinutes:
                    completed?.averageMinutes == null
                        ? null
                        : Number(completed.averageMinutes.toFixed(1))
            }
        };
    });
}

// Distingue dos errores:
// - 404: el usuario no existe.
// - 400: existe, pero no tiene el rol driver.
async function findDriver(id) {
    validateId(id);

    const user = await User.findById(id);

    if (!user) {
        throw new customError(ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.role !== 'driver') {
        invalid('El usuario seleccionado no es un repartidor');
    }

    return user;
}

export const driversService = {
    async list(query = {}) {
        const page = positiveInteger(query.page, 1, 100000);
        const limit = positiveInteger(query.limit, 20, 50);
        const days = positiveInteger(query.days, 30, 90);
        const text = String(query.q ?? '').trim();

        if (text.length > 80) {
            invalid('La búsqueda no puede superar los 80 caracteres');
        }

        const filter = { role: 'driver' };

        if (text) {
            const expression = new RegExp(escapeRegex(text), 'i');

            filter.$or = [
                { firstName: expression },
                { lastName: expression },
                { email: expression },
                { phone: expression }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('firstName lastName email phone active driverProfile')
                .sort({ firstName: 1, lastName: 1, _id: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            User.countDocuments(filter)
        ]);

        return {
            items: await summarize(users, days),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            periodDays: days
        };
    },

    async getById(id, actor, rawDays = 30) {
        validateId(id);
        checkAccess(id, actor);

        const days = positiveInteger(rawDays, 30, 90);

        const user = await User.findOne({
            _id: id,
            role: 'driver'
        })
            .select('firstName lastName email phone active driverProfile')
            .lean();

        if (!user) {
            throw new customError(ERROR_CODES.USER_NOT_FOUND);
        }

        const [driver] = await summarize([user], days);

        const [recentDeliveries, totalDeliveries] = await Promise.all([
            Delivery.find({ driver: user._id })
                .select(
                    'trackingCode status priority order createdAt assignedAt deliveredAt estimatedDeliveryAt'
                )
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),

            Delivery.countDocuments({ driver: user._id })
        ]);

        return {
            driver,
            periodDays: days,
            totalDeliveries,
            recentDeliveries
        };
    },

    async updateAvailability(id, status, actor) {
        validateId(id);
        checkAccess(id, actor);

        const user = await findDriver(id);

        if (status === 'available' && !user.active) {
            invalid('No se puede habilitar un usuario desactivado');
        }

        user.driverProfile = profileUpdate(user, {
            availabilityStatus: status
        });

        await user.save();

        const [summary] = await summarize([
            user.toObject()
        ], 30);

        return summary;
    },

    async updateCapacity(id, capacity, actor) {
        if (actor.role !== 'admin') {
            throw new customError(ERROR_CODES.FORBIDDEN);
        }

        const maxConcurrentDeliveries = positiveInteger(
            capacity,
            undefined,
            MAX_CAPACITY
        );

        const user = await findDriver(id);

        user.driverProfile = profileUpdate(user, {
            maxConcurrentDeliveries
        });

        await user.save();

        const [summary] = await summarize([
            user.toObject()
        ], 30);

        return summary;
    },

    async assertAssignable(id) {
        const user = await findDriver(id);

        if (!user.active) {
            invalid('El repartidor está desactivado');
        }

        const [summary] = await summarize([
            user.toObject()
        ], 30);

        if (!summary.eligibleForAssignment) {
            if (summary.remainingCapacity === 0) {
                invalid(
                    `El repartidor alcanzó su capacidad de ${summary.maxConcurrentDeliveries} entregas activas`
                );
            }

            invalid(
                'El repartidor no está disponible para recibir otra entrega'
            );
        }

        return user;
    }
};
