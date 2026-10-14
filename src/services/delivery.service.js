// src/services/delivery.service.js

import { deliveryRepository } from '../repositories/delivery.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import logger from '../utils/logger.js';

async function validateDeliveryAccess(
    delivery,
    actor
) {
    if (actor.role === 'admin') {
        return;
    }

    if (
        actor.role === 'driver' &&
        delivery.driver?.toString() === actor.id
    ) {
        return;
    }

    if (actor.role === 'customer') {
        const order =
            await orderRepository.findById(
                delivery.order
            );

        if (
            order &&
            order.customer.toString() === actor.id
        ) {
            return;
        }
    }

    throw new customError(
        ERROR_CODES.FORBIDDEN
    );
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
                parseInt(page, 10) || 1
            );

        const limitNum =
            Math.min(
                50,
                Math.max(
                    1,
                    parseInt(limit, 10) || 10
                )
            );

        let filter = {};

        if (
            actor.role === 'driver'
        ) {
            filter = {
                driver: actor.id
            };
        }

        if (
            actor.role === 'customer'
        ) {
            const customerOrders =
                await orderRepository.findAll({
                    skip: 0,
                    limit: 50,
                    filter: {
                        customer:
                            actor.id
                    }
                });

            filter = {
                order: {
                    $in:
                        customerOrders.map(
                            (order) =>
                                order._id
                        )
                }
            };
        }

        const [items, total] =
            await Promise.all([
                deliveryRepository.findAll({
                    skip:
                        (pageNum - 1) *
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
            page: pageNum,
            limit: limitNum,
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
            await deliveryRepository
                .findById(did);

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

    async create({
        order,
        driver,
        priority
    }) {
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

        if (
            existingOrder.status !==
            'created'
        ) {
            throw new customError(
                ERROR_CODES.ORDER_ALREADY_DELIVERED,
                'El pedido ya fue asignado o procesado'
            );
        }

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
                    new Date()
            });

        existingOrder.status =
            'assigned';

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
            await deliveryRepository
                .findById(did);

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
            'delivered'
        ) {
            throw new customError(
                ERROR_CODES.ORDER_ALREADY_DELIVERED,
                'La entrega ya fue completada'
            );
        }

        delivery.status =
            status;

        if (
            status ===
            'delivered'
        ) {
            delivery.deliveredAt =
                new Date();

            const relatedOrder =
                await orderRepository
                    .findById(
                        delivery.order
                    );

            if (relatedOrder) {
                relatedOrder.status =
                    'delivered';

                await orderRepository
                    .save(
                        relatedOrder
                    );
            }
        }

        await deliveryRepository.save(
            delivery
        );

        logger.info(
            `Entrega ${delivery._id} actualizada a: ${status}`
        );

        return delivery;
    },

    async remove(did) {
        const delivery =
            await deliveryRepository
                .deleteById(did);

        if (!delivery) {
            throw new customError(
                ERROR_CODES.DELIVERY_NOT_FOUND
            );
        }

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
            await deliveryRepository
                .findById(did);

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