import {
    orderRepository
} from '../repositories/order.repository.js';

import {
    deliveryRepository
} from '../repositories/delivery.repository.js';

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
    ORDER_STATUS_TRANSITIONS,
    ORDER_TO_DELIVERY_STATUS
} from '../constants/status.constants.js';

import logger from '../utils/logger.js';

function validateOrderAccess(
    order,
    actor
) {
    if (
        actor.role ===
            'customer' &&
        order.customer.toString() !==
            actor.id
    ) {
        throw new customError(
            ERROR_CODES.FORBIDDEN
        );
    }
}

function historyEntry(
    from,
    to,
    actor,
    source =
        'order'
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

async function prepareLinkedDeliverySync(
    order,
    nextOrderStatus,
    actor
) {
    const nextDeliveryStatus =
        ORDER_TO_DELIVERY_STATUS[
            nextOrderStatus
        ];

    if (
        !nextDeliveryStatus ||
        !order.delivery
    ) {
        return null;
    }

    const delivery =
        await deliveryRepository.findById(
            order.delivery
        );

    if (!delivery) {
        throw new customError(
            ERROR_CODES.DELIVERY_NOT_FOUND,
            'El pedido referencia una entrega inexistente'
        );
    }

    if (
        delivery.status ===
        nextDeliveryStatus
    ) {
        return delivery;
    }

    validateTransition(
        DELIVERY_STATUS_TRANSITIONS,
        delivery.status,
        nextDeliveryStatus,
        'entrega'
    );

    const previousStatus =
        delivery.status;

    delivery.status =
        nextDeliveryStatus;

    delivery.statusHistory.push(
        historyEntry(
            previousStatus,
            nextDeliveryStatus,
            actor,
            'order'
        )
    );

    if (
        nextDeliveryStatus ===
            'assigned' &&
        !delivery.assignedAt
    ) {
        delivery.assignedAt =
            new Date();
    }

    if (
        nextDeliveryStatus ===
        'delivered'
    ) {
        delivery.deliveredAt =
            new Date();
    }

    return delivery;
}

export const orderService = {

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

        const filter =
            actor.role ===
            'customer'
                ? {
                      customer:
                          actor.id
                  }
                : {};

        const [
            items,
            total
        ] =
            await Promise.all([
                orderRepository.findAll({
                    skip:
                        (pageNum -
                            1) *
                        limitNum,

                    limit:
                        limitNum,

                    filter
                }),

                orderRepository.count(
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
        oid,
        actor
    ) {
        const order =
            await orderRepository.findById(
                oid
            );

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND
            );
        }

        validateOrderAccess(
            order,
            actor
        );

        return order;
    },

    async create(
        {
            customer,
            items,
            deliveryAddress,
            priority
        },
        actor
    ) {
        let customerId =
            customer;

        if (
            actor.role ===
            'customer'
        ) {
            if (
                customer &&
                customer !==
                    actor.id
            ) {
                throw new customError(
                    ERROR_CODES.FORBIDDEN
                );
            }

            customerId =
                actor.id;
        }

        if (!customerId) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Falta el cliente'
            );
        }

        if (
            !items ||
            items.length ===
                0
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Faltan los items del pedido'
            );
        }

        if (
            !deliveryAddress
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Falta la dirección de entrega'
            );
        }

        const user =
            await userRepository.findById(
                customerId
            );

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        if (
            user.role ===
            'driver'
        ) {
            throw new customError(
                ERROR_CODES.FORBIDDEN,
                'Los repartidores no pueden crear pedidos'
            );
        }

        const total =
            items.reduce(
                (
                    accumulator,
                    item
                ) =>
                    accumulator +
                    item.price *
                        item.quantity,
                0
            );

        const newOrder =
            await orderRepository.create({
                customer:
                    customerId,

                items,

                deliveryAddress,

                total,

                priority:
                    priority ||
                    'normal',

                status:
                    'created',

                statusHistory: [
                    historyEntry(
                        null,
                        'created',
                        actor,
                        'order'
                    )
                ]
            });

        logger.info(
            `[EMAIL SIMULADO] Enviando confirmación al usuario ${customerId}...`
        );

        logger.info(
            `[EMAIL SIMULADO] Tu pedido ${newOrder._id} fue creado. Total: $${total}`
        );

        logger.info(
            `Pedido creado: ${newOrder._id} (cliente: ${customerId}, total: $${total})`
        );

        const shippingCost =
            newOrder.items.reduce(
                (
                    accumulator,
                    item
                ) =>
                    accumulator +
                    item.quantity *
                        10,
                0
            );

        return {
            order:
                newOrder,

            shippingCost
        };
    },

    async updateStatus(
        oid,
        status,
        actor
    ) {
        if (!status) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El estado es obligatorio'
            );
        }

        const order =
            await orderRepository.findById(
                oid
            );

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND
            );
        }

        if (
            order.status ===
                status
        ) {
            return order;
        }

        if (
            order.status ===
            'delivered'
        ) {
            throw new customError(
                ERROR_CODES.ORDER_ALREADY_DELIVERED
            );
        }

        validateTransition(
            ORDER_STATUS_TRANSITIONS,
            order.status,
            status,
            'pedido'
        );

        const linkedDelivery =
            await prepareLinkedDeliverySync(
                order,
                status,
                actor
            );

        const previousStatus =
            order.status;

        order.status =
            status;

        order.statusHistory.push(
            historyEntry(
                previousStatus,
                status,
                actor,
                'order'
            )
        );

        const saveOperations = [
            orderRepository.save(
                order
            )
        ];

        if (
            linkedDelivery
        ) {
            saveOperations.push(
                deliveryRepository.save(
                    linkedDelivery
                )
            );
        }

        await Promise.all(
            saveOperations
        );

        logger.info(
            `Pedido ${order._id} actualizado de ${previousStatus} a ${status}`
        );

        return order;
    },

    async remove(
        oid
    ) {
        const order =
            await orderRepository.deleteById(
                oid
            );

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND
            );
        }

        return order;
    },

    async addReceipt(
        oid,
        file,
        actor
    ) {
        if (!file) {
            throw new customError(
                ERROR_CODES.FILE_REQUIRED,
                'Debe adjuntar un archivo (campo "receipt")'
            );
        }

        const order =
            await orderRepository.findById(
                oid
            );

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND
            );
        }

        validateOrderAccess(
            order,
            actor
        );

        order.receipt = {
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

        await orderRepository.save(
            order
        );

        logger.info(
            `Comprobante asociado al pedido ${oid}: ${file.originalname}`
        );

        return order;
    }
};