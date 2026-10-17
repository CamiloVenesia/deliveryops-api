
import { orderService } from '../services/order.service.js';

import {
  orderCreationService
} from '../services/order-creation.service.js';

export const orderController = {
  async getAll(req, res) {
    const result = await orderService.getAll(
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

    res.status(201).json({
      order,
      shippingCost,
      message: 'Pedido creado y email enviado'
    });
  },

  async updateStatus(req, res) {
    const { status } = req.body;

    const order = await orderService.updateStatus(
      req.params.oid,
      status,
      req.user
    );

    res.json(order);
  },

  async remove(req, res) {
    await orderService.remove(req.params.oid);

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
