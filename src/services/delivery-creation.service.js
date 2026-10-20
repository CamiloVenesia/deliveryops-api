
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

import Delivery from '../models/delivery.model.js';
import Order from '../models/order.model.js';
import Depot from '../models/depot.model.js';

import { deliveryService } from './delivery.service.js';
import { driversService } from './drivers.service.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import logger from '../utils/logger.js';

const EXTRA_FIELDS = [
    'vehicle',
    'route',
    'estimatedDeliveryAt',
    'costs',
    'driverNotes'
];

function invalid(message) {
    throw new customError(ERROR_CODES.VALIDATION_ERROR, message);
}

async function getValidDepot(id) {
    if (id == null) return null;

    if (!mongoose.isValidObjectId(id)) {
        invalid('ID de depósito inválido');
    }

    const depot = await Depot.findById(id);

    if (!depot || !depot.active) {
        invalid('El depósito no existe o está inactivo');
    }

    return depot._id;
}

function createTrackingCode() {
    return `DOPD-${randomUUID()
        .replaceAll('-', '')
        .slice(0, 20)
        .toUpperCase()}`;
}

function extraFields(data) {
    const result = {};

    for (const field of EXTRA_FIELDS) {
        if (Object.hasOwn(data, field)) {
            result[field] = data[field];
        }
    }

    return result;
}

export const deliveryCreationService = {
    async create(data, actor) {
        const order = await Order.findById(data.order);

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND,
                'El pedido no existe'
            );
        }

        const depotId = Object.hasOwn(data, 'originDepot')
            ? data.originDepot
            : order.originDepot ?? null;

        const originDepot = await getValidDepot(depotId);

        const trackingCode = (
            data.trackingCode ||
            order.trackingCode ||
            createTrackingCode()
        ).trim().toUpperCase();

        if (await Delivery.exists({ trackingCode })) {
            invalid('El código de seguimiento ya está utilizado');
        }

        const details = {
            trackingCode,
            originDepot,
            ...extraFields(data)
        };

        const candidate = new Delivery({
            order: data.order,
            driver: data.driver,
            priority: data.priority ?? 'normal',
            status: 'assigned',
            ...details
        });

        // Validamos la información antes de modificar el pedido.
        try {
            await candidate.validate();
        } catch (error) {
            if (error instanceof mongoose.Error.ValidationError) {
                invalid(error.message);
            }

            throw error;
        }

        // Bloque 10: nunca asignar una nueva entrega
        // a un usuario inactivo, ocupado o fuera de servicio.
        await driversService.assertAssignable(data.driver);

        // Conservamos la lógica existente de sincronización
        // entre pedidos y entregas.
        const delivery = await deliveryService.create(
            {
                order: data.order,
                driver: data.driver,
                priority: data.priority
            },
            actor
        );

        try {
            for (const [key, value] of Object.entries(details)) {
                delivery.set(key, value);
            }

            await delivery.save();

            return delivery;
        } catch (error) {
            try {
                await deliveryService.remove(delivery.id, actor);
            } catch (rollbackError) {
                logger.error(
                    `ALERTA: reversión fallida para entrega ${delivery.id}: ${rollbackError.message}`
                );

                throw new Error(
                    `La asignación ${delivery.id} necesita revisión manual porque falló la reversión`,
                    { cause: error }
                );
            }

            if (error?.code === 11000) {
                invalid('El código de seguimiento ya está utilizado');
            }

            if (error instanceof mongoose.Error.ValidationError) {
                invalid(error.message);
            }

            throw error;
        }
    }
};
