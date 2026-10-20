
import { randomUUID } from 'node:crypto';

import {
    orderRepository
} from '../repositories/order.repository.js';

import {
    userRepository
} from '../repositories/user.repository.js';

import Depot from '../models/depot.model.js';

import {
    customError
} from '../utils/customError.js';

import {
    ERROR_CODES
} from '../constants/error.constants.js';

import logger from '../utils/logger.js';

const LOGISTICS_FIELDS = [
    'recipient',
    'deliveryAddressDetails',
    'deliveryInstructions',
    'contactlessDelivery',
    'internalNotes',
    'packageInfo',
    'shippingCost',
    'priority',
    'sourceChannel',
    'originDepot',
    'requestedDeliveryAt',
    'estimatedDeliveryAt'
];

function fail(code, message) {
    throw new customError(code, message);
}

function calculateTotal(items) {
    return Math.round(
        items.reduce(
            (total, item) =>
                total + item.price * item.quantity,
            0
        ) * 100
    ) / 100;
}

function calculateLegacyShipping(items) {
    return items.reduce(
        (total, item) =>
            total + item.quantity * 10,
        0
    );
}

async function validateOriginDepot(id) {
    if (!id) {
        return;
    }

    const depot = await Depot.findById(id);

    if (!depot) {
        fail(
            ERROR_CODES.VALIDATION_ERROR,
            'El depósito de origen no existe'
        );
    }

    if (!depot.active) {
        fail(
            ERROR_CODES.VALIDATION_ERROR,
            'El depósito de origen está inactivo'
        );
    }
}

function generateTrackingCode() {
    return `DOPS-${randomUUID()
        .replaceAll('-', '')
        .slice(0, 20)
        .toUpperCase()}`;
}

export const orderCreationService = {
    async create(data, actor) {
        let customerId = data.customer;

        if (actor.role === 'customer') {
            if (
                customerId &&
                customerId.toString() !== actor.id.toString()
            ) {
                fail(
                    ERROR_CODES.FORBIDDEN,
                    'No puede crear pedidos para otro cliente'
                );
            }

            customerId = actor.id;
        }

        if (!customerId) {
            fail(
                ERROR_CODES.VALIDATION_ERROR,
                'Falta el cliente'
            );
        }

        if (
            !Array.isArray(data.items) ||
            !data.items.length
        ) {
            fail(
                ERROR_CODES.VALIDATION_ERROR,
                'Faltan los items del pedido'
            );
        }

        if (!data.deliveryAddress) {
            fail(
                ERROR_CODES.VALIDATION_ERROR,
                'Falta la dirección de entrega'
            );
        }

        const customer =
            await userRepository.findById(
                customerId
            );

        if (!customer) {
            fail(
                ERROR_CODES.USER_NOT_FOUND,
                'Usuario no encontrado'
            );
        }

        if (customer.role === 'driver') {
            fail(
                ERROR_CODES.FORBIDDEN,
                'Los repartidores no pueden crear pedidos'
            );
        }

        await validateOriginDepot(
            data.originDepot
        );

        const total =
            calculateTotal(data.items);

        const legacyShippingCost =
            calculateLegacyShipping(data.items);

        const logistics = {};

        for (const field of LOGISTICS_FIELDS) {
            if (Object.hasOwn(data, field)) {
                logistics[field] = data[field];
            }
        }

        const shippingCost = data.shippingCost
            ? {
                ...data.shippingCost
            }
            : {
                currency: 'ARS',
                baseCost: legacyShippingCost
            };

        const calculatedShipping = [
            shippingCost.baseCost,
            shippingCost.distanceCost,
            shippingCost.weightCost,
            shippingCost.prioritySurcharge,
            shippingCost.additionalCost
        ].reduce(
            (sum, value) =>
                sum + (Number(value) || 0),
            0
        );

        shippingCost.total = Math.round(
            calculatedShipping * 100
        ) / 100;

        const order =
            await orderRepository.create({
                customer: customerId,
                items: data.items,
                deliveryAddress:
                    data.deliveryAddress,
                ...logistics,
                shippingCost,
                total,
                status: 'created',
                trackingCode:
                    generateTrackingCode(),
                statusHistory: [
                    {
                        from: null,
                        to: 'created',
                        changedBy: actor.id,
                        changedByRole:
                            actor.role,
                        source: 'order',
                        changedAt: new Date()
                    }
                ]
            });

        logger.info(
            `Pedido creado: ${order.id} (cliente: ${customerId}, total: $${total})`
        );

        return {
            order,
            shippingCost:
                shippingCost.total
        };
    }
};
