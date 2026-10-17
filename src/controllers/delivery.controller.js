
import {
  deliveryService
} from '../services/delivery.service.js';

import {
  deliveryCreationService
} from '../services/delivery-creation.service.js';

export const deliveryController = {
  async getAll(req, res) {
    const result = await deliveryService.getAll(
      req.query,
      req.user
    );

    res.json(result);
  },

  async getById(req, res) {
    const delivery = await deliveryService.getById(
      req.params.did,
      req.user
    );

    res.json(delivery);
  },

  async create(req, res) {
    const delivery = await deliveryCreationService.create(
      req.body,
      req.user
    );

    res.status(201).json(delivery);
  },

  async updateStatus(req, res) {
    const delivery = await deliveryService.updateStatus(
      req.params.did,
      req.body.status,
      req.user
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
    const delivery = await deliveryService.addReceipt(
      req.params.did,
      req.file,
      req.user
    );

    res.status(201).json(delivery);
  }
};
