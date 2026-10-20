
import NotificationJob from '../models/notification-job.model.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';

import {
    channelConfigured,
    normalizeWhatsappPhone
} from './notification-provider.service.js';

import logger from '../utils/logger.js';

export function notificationsEnabled() {
    return (
        process.env.NOTIFICATIONS_ENABLED === 'true' &&
        process.env.NODE_ENV !== 'test'
    );
}

async function queueForUser({
    entityType,
    entityId,
    event,
    userId,
    code,
    description
}) {
    if (
        !notificationsEnabled() ||
        !userId
    ) {
        return;
    }

    const user = await User.findById(userId);

    if (!user || !user.active) {
        return;
    }

    const preferences =
        user.notificationPreferences || {};

    const name = String(
        user.firstName || 'cliente'
    ).slice(0, 100);

    const safeCode = String(
        code || entityId
    ).slice(0, 80);

    const safeDescription = String(
        description
    ).slice(0, 180);

    const destinations = [
        {
            channel: 'email',
            allowed: preferences.email !== false,
            recipient: user.email
        },
        {
            channel: 'whatsapp',
            allowed: preferences.whatsapp === true,
            recipient: normalizeWhatsappPhone(
                user.phone
            )
        }
    ];

    for (const destination of destinations) {
        if (
            !destination.allowed ||
            !destination.recipient
        ) {
            continue;
        }

        if (!channelConfigured(destination.channel)) {
            logger.warning(
                `Notificación ${destination.channel} omitida: faltan variables de entorno`
            );

            continue;
        }

        const eventKey = [
            entityType,
            entityId,
            event,
            user.id,
            destination.channel
        ].join(':');

        // El índice único impide insertar
        // dos veces el mismo aviso.
        await NotificationJob.updateOne(
            { eventKey },
            {
                $setOnInsert: {
                    eventKey,
                    entityType,
                    entityId,
                    userId: user._id,
                    event,
                    channel: destination.channel,
                    recipient: destination.recipient,
                    payload: {
                        name,
                        code: safeCode,
                        description: safeDescription
                    }
                }
            },
            { upsert: true }
        );
    }
}

export const notificationService = {
    async orderCreated(order) {
        await queueForUser({
            entityType: 'order',
            entityId: order._id,
            event: 'order.created',
            userId: order.customer,
            code:
                order.trackingCode ||
                order.id,
            description: 'Tu pedido fue creado'
        });
    },

    async orderStatusChanged(order) {
        await queueForUser({
            entityType: 'order',
            entityId: order._id,
            event: `order.${order.status}`,
            userId: order.customer,
            code:
                order.trackingCode ||
                order.id,
            description:
                `Tu pedido cambió al estado ${order.status}`
        });
    },

    async deliveryAssigned(delivery) {
        const order = await Order.findById(
            delivery.order
        );

        if (!order) {
            return;
        }

        await queueForUser({
            entityType: 'delivery',
            entityId: delivery._id,
            event: 'delivery.assigned.customer',
            userId: order.customer,
            code:
                order.trackingCode ||
                delivery.trackingCode ||
                delivery.id,
            description:
                'Tu pedido fue asignado a un repartidor'
        });

        await queueForUser({
            entityType: 'delivery',
            entityId: delivery._id,
            event: 'delivery.assigned.driver',
            userId: delivery.driver,
            code:
                order.trackingCode ||
                delivery.trackingCode ||
                delivery.id,
            description:
                'Tenés una nueva entrega asignada'
        });
    },

    async deliveryStatusChanged(delivery) {
        const order = await Order.findById(
            delivery.order
        );

        if (!order) {
            return;
        }

        await queueForUser({
            entityType: 'delivery',
            entityId: delivery._id,
            event: `delivery.${delivery.status}`,
            userId: order.customer,
            code:
                order.trackingCode ||
                delivery.trackingCode ||
                delivery.id,
            description:
                `Tu entrega cambió al estado ${delivery.status}`
        });
    }
};

// Un fallo al registrar el aviso no debe
// convertir la operación logística en un error.
export async function safelyQueue(task) {
    try {
        await task();
    } catch (error) {
        logger.error(
            `No se pudo registrar la notificación: ${error.message}`
        );
    }
}
