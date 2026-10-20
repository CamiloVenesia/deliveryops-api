
import {
    orderService
} from '../services/order.service.js';

import {
    notificationService,
    safelyQueue
} from '../services/notification.service.js';

import {
    orderCreationService
} from '../services/order-creation.service.js';

import {
    operationsSearchService
} from '../services/operations-search.service.js';

const SEARCH_PARAMS = new Set([
    'q',
    'status',
    'priority',
    'from',
    'to',
    'sort'
]);

function hasSearchParams(query) {
    return Object.keys(query).some(
        key => SEARCH_PARAMS.has(key)
    );
}

export const orderController = {
    async getAll(req, res) {
        const result = hasSearchParams(req.query)
            ? await operationsSearchService.orders(
                req.query,
                req.user
            )
            : await orderService.getAll(
                req.query,
                req.user
            );

        res.json(result);
    },

    async getById(req, res) {
        const order = await orderService.getById(
            req.params.oid,
            req.user
        );

        res.json(order);
    },

    async create(req, res) {
        const {
            order,
            shippingCost
        } = await orderCreationService.create(
            req.body,
            req.user
        );

        await safelyQueue(
            () => notificationService.orderCreated(
                order
            )
        );

        res.status(201).json({
            order,
            shippingCost,
            message: 'Pedido creado correctamente'
        });
    },

    async updateStatus(req, res) {
        const order =
            await orderService.updateStatus(
                req.params.oid,
                req.body.status,
                req.user
            );

        await safelyQueue(
            () => notificationService.orderStatusChanged(
                order
            )
        );

        res.json(order);
    },

    async remove(req, res) {
        await orderService.remove(
            req.params.oid
        );

        res.json({
            message: 'Pedido eliminado'
        });
    },

    async addReceipt(req, res) {
        const order = await orderService.addReceipt(
            req.params.oid,
            req.file,
            req.user
        );

        res.status(201).json(order);
    }
};
