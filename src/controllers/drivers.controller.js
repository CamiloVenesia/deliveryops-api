
import {
    driversService
} from '../services/drivers.service.js';

export const driversController = {
    async list(req, res) {
        const result = await driversService.list(req.query);

        res.json(result);
    },

    async getMe(req, res) {
        const result = await driversService.getById(
            req.user.id,
            req.user,
            req.query.days
        );

        res.json(result);
    },

    async getById(req, res) {
        const result = await driversService.getById(
            req.params.did,
            req.user,
            req.query.days
        );

        res.json(result);
    },

    async updateAvailability(req, res) {
        const result = await driversService.updateAvailability(
            req.params.did,
            req.body.status,
            req.user
        );

        res.json(result);
    },

    async updateCapacity(req, res) {
        const result = await driversService.updateCapacity(
            req.params.did,
            req.body.maxConcurrentDeliveries,
            req.user
        );

        res.json(result);
    }
};
