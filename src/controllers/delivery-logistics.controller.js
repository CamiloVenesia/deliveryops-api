
import {
  deliveryLogisticsService
} from '../services/delivery-logistics.service.js';

export const deliveryLogisticsController = {
  async getDetails(req, res) {
    const result = await deliveryLogisticsService.getDetails(
      req.params.did,
      req.user
    );

    res.json(result);
  },

  async updateOperations(req, res) {
    const delivery = await deliveryLogisticsService.updateOperations(
      req.params.did,
      req.body,
      req.user
    );

    res.json({
      message: 'Datos operativos actualizados',
      delivery
    });
  },

  async registerLocation(req, res) {
    const result = await deliveryLogisticsService.registerLocation(
      req.params.did,
      req.body,
      req.user
    );

    res.status(201).json({
      message: 'Ubicación registrada',
      ...result
    });
  },

  async getLocations(req, res) {
    const result = await deliveryLogisticsService.getLocations(
      req.params.did,
      req.user
    );

    res.json(result);
  },

  async registerProof(req, res) {
    const result = await deliveryLogisticsService.registerProof(
      req.params.did,
      req.body,
      req.user
    );

    res.status(201).json({
      message: 'Comprobante de entrega registrado',
      ...result
    });
  },

  async getProof(req, res) {
    const result = await deliveryLogisticsService.getProof(
      req.params.did,
      req.user
    );

    res.json(result);
  }
};
