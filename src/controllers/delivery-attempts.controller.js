
import {
  deliveryAttemptsService
} from '../services/delivery-attempts.service.js';

export const deliveryAttemptsController = {
  async register(req, res) {
    const result = await deliveryAttemptsService.register(
      req.params.did,
      req.body,
      req.user
    );

    res.status(201).json({
      message: 'Intento de entrega registrado',
      ...result
    });
  },

  async getAll(req, res) {
    const result = await deliveryAttemptsService.getAll(
      req.params.did,
      req.user
    );

    res.json(result);
  }
};
