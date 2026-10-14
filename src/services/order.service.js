// src/services/order.service.js

import { orderRepository } from '../repositories/order.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import logger from '../utils/logger.js';

function validateOrderAccess(
    order,
    actor
) {
    if (
        actor.role === 'customer' &&
        order.customer.toString() !== actor.id
    ) {
        throw new customError(
            ERROR_CODES.FORBIDDEN
        );
    }
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

        const filter =
            actor.role === 'customer'
                ? {
                    customer:
                        actor.id
                }
                : {};

        const [items, total] =
            await Promise.all([
                orderRepository.findAll({
                    skip:
                        (pageNum - 1) *
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
        oid,
        actor
    ) {
        const order =
            await orderRepository
                .findById(oid);

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
                customer !== actor.id
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
            items.length === 0
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'Faltan los items del pedido'
            );
        }

        if (!deliveryAddress) {
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
            user.role === 'driver'
        ) {
            throw new customError(
                ERROR_CODES.FORBIDDEN,
                'Los repartidores no pueden crear pedidos'
            );
        }

        const total =
            items.reduce(
                (
                    acc,
                    item
                ) =>
                    acc +
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
                    'created'
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
                    acc,
                    item
                ) =>
                    acc +
                    item.quantity *
                    10,
                0
            );

        return {
            order: newOrder,
            shippingCost
        };
    },

    async updateStatus(
        oid,
        status
    ) {
        if (!status) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'El estado es obligatorio'
            );
        }

        const order =
            await orderRepository
                .findById(oid);

        if (!order) {
            throw new customError(
                ERROR_CODES.ORDER_NOT_FOUND
            );
        }

        if (
            order.status ===
            'delivered'
        ) {
            throw new customError(
                ERROR_CODES.ORDER_ALREADY_DELIVERED
            );
        }

        order.status =
            status;

        await orderRepository.save(
            order
        );

        logger.info(
            `Pedido ${order._id} actualizado a estado: ${status}`
        );

        return order;
    },

    async remove(oid) {
        const order =
            await orderRepository
                .deleteById(oid);

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
            await orderRepository
                .findById(oid);

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