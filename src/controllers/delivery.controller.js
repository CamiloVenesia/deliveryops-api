// src/controllers/delivery.controller.js

import { deliveryService } from '../services/delivery.service.js';

export const deliveryController = {

    async getAll(req, res) {
        const result =
            await deliveryService.getAll(
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
        const {
            order,
            driver,
            priority
        } = req.body;

        const newDelivery =
            await deliveryService.create({
                order,
                driver,
                priority
            });

        res.status(201).json(
            newDelivery
        );
    },

    async updateStatus(req, res) {
        const {
            status
        } = req.body;

        const delivery =
            await deliveryService.updateStatus(
                req.params.did,
                status,
                req.user
            );

        res.json(delivery);
    },

    async remove(req, res) {
        await deliveryService.remove(
            req.params.did
        );

        res.json({
            message:
                'Entrega eliminada'
        });
    },

    async addReceipt(req, res) {
        const delivery =
            await deliveryService.addReceipt(
                req.params.did,
                req.file,
                req.user
            );

        res.status(201).json(
            delivery
        );
    }
};