
import {
    notificationService,
    safelyQueue
} from '../services/notification.service.js';

import {
    deliveryService
} from '../services/delivery.service.js';

import {
    deliveryCreationService
} from '../services/delivery-creation.service.js';

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

export const deliveryController = {
    async getAll(req, res) {
        const result = hasSearchParams(req.query)
            ? await operationsSearchService.deliveries(
                req.query,
                req.user
            )
            : await deliveryService.getAll(
                req.query,
                req.user
            );

        res.json(result);
    },

    async getById(req, res) {
        const delivery =
            await deliveryService.getById(
                req.params.did,
                req.user
            );

        res.json(delivery);
    },

    async create(req, res) {
        const delivery =
            await deliveryCreationService.create(
                req.body,
                req.user
            );

        await safelyQueue(
            () => notificationService.deliveryAssigned(
                delivery
            )
        );

        res.status(201).json(delivery);
    },

    async updateStatus(req, res) {
        const delivery =
            await deliveryService.updateStatus(
                req.params.did,
                req.body.status,
                req.user
            );

        await safelyQueue(
            () => notificationService.deliveryStatusChanged(
                delivery
            )
        );

        res.json(delivery);
    },

    async remove(req, res) {
        await deliveryService.remove(
            req.params.did,
            req.user
        );

        res.json({
            message: 'Entrega eliminada'
        });
    },

    async addReceipt(req, res) {
        const delivery =
            await deliveryService.addReceipt(
                req.params.did,
                req.file,
                req.user
            );

        res.status(201).json(delivery);
    }
};
