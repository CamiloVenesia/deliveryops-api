import {
    deliveryRepository
} from '../repositories/delivery.repository.js';

import {
    orderRepository
} from '../repositories/order.repository.js';

import {
    userRepository
} from '../repositories/user.repository.js';

import {
    customError
} from '../utils/customError.js';

import {
    ERROR_CODES
} from '../constants/error.constants.js';

import {
    DELIVERY_STATUS_TRANSITIONS,
    DELIVERY_TO_ORDER_STATUS,
    ORDER_STATUS_TRANSITIONS
} from '../constants/status.constants.js';

import logger from '../utils/logger.js';

async function validateDeliveryAccess(
    delivery,
    actor
) {
    if (
        actor.role ===
        'admin'
    ) {
        return;
    }

    if (
        actor.role ===
            'driver' &&
        delivery.driver?.toString() ===
            actor.id
    ) {
        return;
    }

    if (
        actor.role ===
        'customer'
    ) {
        const order =
            await orderRepository.findById(
                delivery.order
            );

        if (
            order &&
            order.customer.toString() ===
                actor.id
        ) {
            return;
        }
    }

    throw new customError(
        ERROR_CODES.FORBIDDEN
    );
}

function historyEntry(
    from,
    to,
    actor,
    source =
        'delivery'
) {
    return {
        from,
        to,

        changedBy:
            actor?.id ??
            null,

        changedByRole:
            actor?.role ??
            'system',

        source,

        changedAt:
            new Date()
    };
}

function validateTransition(
    transitions,
    from,
    to,
    entityLabel
) {
    if (
        from ===
        to
    ) {
        return;
    }

    const allowed =
        transitions[
            from
        ] ??
        [];

    if (
        !allowed.includes(
            to
        )
    ) {
        throw new customError(
            ERROR_CODES.VALIDATION_ERROR,
            `Transición inválida de ${entityLabel}: ${from} → ${to}`
        );
    }
}

export const deliveryService = {

    async getAll(
        {
            page = 1,
            limit = 10
        } = {},
        actor
    ) {
        const pageNum =
            Math.max(
                1,
                parseInt(
                    page,
                    10
                ) ||
                    1
            );

        const limitNum =
            Math.min(
                50,
                Math.max(
                    1,
                    parseInt(
                        limit,
                        10
                    ) ||
                        10
                )
            );

        let filter = {};

        if (
            actor.role ===
            'driver'
        ) {
            filter = {
                driver:
                    actor.id
            };
        }

        if (
            actor.role ===
            'customer'
        ) {
            const customerOrders =
                await orderRepository.findAll({
                    skip:
                        0,

                    limit:
                        50,

                    filter: {
                        customer:
                            actor.id
                    }
                });

            filter = {
                order: {
                    $in:
                        customerOrders.map(
                            (
                                order
                            ) =>
                                order._id
                        )
                }
            };
        }

        const [
            items,
            total
        ] =
            await Promise.all([
                deliveryRepository.findAll({
                    skip:
                        (pageNum -
                            1) *
                        limitNum,

                    limit:
                        limitNum,

                    filter
                }),

                deliveryRepository.count(
                    filter
                )
            ]);

        return {
            items,
            page:
                pageNum,
            limit:
                limitNum,
            total,

            totalPages:
                Math.ceil(
                    total /
                        limitNum
                )
        };
    },

    async getById(
        did,
        actor
    ) {
        const delivery =
            await deliveryRepository.findById(
                did
            );

        if (!delivery) {
            throw new customError(
                ERROR_CODES.DELIVERY_NOT_FOUND
            );
        }

        await validateDeliveryAccess(
            delivery,
            actor
        );

        return delivery;
    },

    async create(
        {
            order,
            driver,
            priority
        },
        actor
    ) {
        if (!order) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El pedido es obligatorio'
            );
        }

        if (!driver) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El repartidor es obligatorio'
            );
        }

        const existingOrder =
            await orderRepository.findById(
                order
            );

        if (!existingOrder) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND,
                'El pedido no existe'
            );
        }

        if (
            existingOrder.delivery
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El pedido ya tiene una entrega asociada'
            );
        }

        if (
            ![
                'created',
                'assigned'
            ].includes(
                existingOrder.status
            )
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El pedido ya fue procesado y no puede asignarse'
            );
        }

        const existingDriver =
            await userRepository.findById(
                driver
            );

        if (!existingDriver) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND,
                'El repartidor no existe'
            );
        }

        if (
            existingDriver.role !==
            'driver'
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El usuario no tiene rol de repartidor'
            );
        }

        const now =
            new Date();

        const newDelivery =
            await deliveryRepository.create({
                order,

                driver,

                priority:
                    priority ||
                    'normal',

                status:
                    'assigned',

                assignedAt:
                    now,

                statusHistory: [
                    historyEntry(
                        null,
                        'assigned',
                        actor,
                        'delivery'
                    )
                ]
            });

        if (
            existingOrder.status ===
            'created'
        ) {
            existingOrder.statusHistory.push(
                historyEntry(
                    'created',
                    'assigned',
                    actor,
                    'delivery'
                )
            );

            existingOrder.status =
                'assigned';
        }

        existingOrder.delivery =
            newDelivery._id;

        await orderRepository.save(
            existingOrder
        );

        logger.info(
            `Entrega ${newDelivery._id} creada para el pedido ${order}`
        );

        return newDelivery;
    },

    async updateStatus(
        did,
        status,
        actor
    ) {
        const delivery =
            await deliveryRepository.findById(
                did
            );

        if (!delivery) {
            throw new customError(
                ERROR_CODES.DELIVERY_NOT_FOUND
            );
        }

        await validateDeliveryAccess(
            delivery,
            actor
        );

        if (
            delivery.status ===
            status
        ) {
            return delivery;
        }

        if (
            delivery.status ===
            'delivered'
        ) {
            throw new customError(
                ERROR_CODES.ORDER_ALREADY_DELIVERED,
                'La entrega ya fue completada'
            );
        }

        validateTransition(
            DELIVERY_STATUS_TRANSITIONS,
            delivery.status,
            status,
            'entrega'
        );

        const relatedOrder =
            await orderRepository.findById(
                delivery.order
            );

        const nextOrderStatus =
            DELIVERY_TO_ORDER_STATUS[
                status
            ];

        if (
            relatedOrder &&
            nextOrderStatus &&
            relatedOrder.status !==
                nextOrderStatus
        ) {
            validateTransition(
                ORDER_STATUS_TRANSITIONS,
                relatedOrder.status,
                nextOrderStatus,
                'pedido'
            );
        }

        const previousDeliveryStatus =
            delivery.status;

        delivery.status =
            status;

        delivery.statusHistory.push(
            historyEntry(
                previousDeliveryStatus,
                status,
                actor,
                'delivery'
            )
        );

        if (
            status ===
                'assigned' &&
            !delivery.assignedAt
        ) {
            delivery.assignedAt =
                new Date();
        }

        if (
            status ===
            'delivered'
        ) {
            delivery.deliveredAt =
                new Date();
        }

        const saveOperations = [
            deliveryRepository.save(
                delivery
            )
        ];

        if (
            relatedOrder &&
            nextOrderStatus &&
            relatedOrder.status !==
                nextOrderStatus
        ) {
            const previousOrderStatus =
                relatedOrder.status;

            relatedOrder.status =
                nextOrderStatus;

            relatedOrder.statusHistory.push(
                historyEntry(
                    previousOrderStatus,
                    nextOrderStatus,
                    actor,
                    'delivery'
                )
            );

            saveOperations.push(
                orderRepository.save(
                    relatedOrder
                )
            );
        }

        await Promise.all(
            saveOperations
        );

        logger.info(
            `Entrega ${delivery._id} actualizada de ${previousDeliveryStatus} a ${status}`
        );

        return delivery;
    },

    async remove(
        did,
        actor
    ) {
        const delivery =
            await deliveryRepository.findById(
                did
            );

        if (!delivery) {
            throw new customError(
                ERROR_CODES.DELIVERY_NOT_FOUND
            );
        }

        if (
            ![
                'pending',
                'assigned'
            ].includes(
                delivery.status
            )
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Solo pueden eliminarse entregas pendientes o asignadas'
            );
        }

        const relatedOrder =
            await orderRepository.findById(
                delivery.order
            );

        if (
            relatedOrder &&
            relatedOrder.delivery?.toString() ===
                did
        ) {
            if (
                relatedOrder.status ===
                'assigned'
            ) {
                relatedOrder.statusHistory.push(
                    historyEntry(
                        'assigned',
                        'created',
                        actor,
                        'delivery'
                    )
                );

                relatedOrder.status =
                    'created';
            }

            relatedOrder.delivery =
                null;

            await orderRepository.save(
                relatedOrder
            );
        }

        await deliveryRepository.deleteById(
            did
        );

        logger.info(
            `Entrega ${did} eliminada`
        );

        return delivery;
    },

    async addReceipt(
        did,
        file,
        actor
    ) {
        if (!file) {
            throw new customError(
                ERROR_CODES.FILE_REQUIRED,
                'Debe adjuntar un archivo (campo "receipt")'
            );
        }

        const delivery =
            await deliveryRepository.findById(
                did
            );

        if (!delivery) {
            throw new customError(
                ERROR_CODES.DELIVERY_NOT_FOUND
            );
        }

        await validateDeliveryAccess(
            delivery,
            actor
        );

        delivery.receipt = {
            originalName:
                file.originalname,

            generatedName:
                file.filename,

            path:
                file.path,

            mimetype:
                file.mimetype,

            size:
                file.size,

            uploadedAt:
                new Date()
        };

        await deliveryRepository.save(
            delivery
        );

        logger.info(
            `Comprobante asociado a la entrega ${did}: ${file.originalname}`
        );

        return delivery;
    }
};