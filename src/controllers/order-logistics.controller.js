
import {
  orderLogisticsService
} from '../services/order-logistics.service.js';

export const orderLogisticsController = {
  async update(req, res) {
    const order = await orderLogisticsService.update(
      req.params.oid,
      req.body,
      req.user
    );

    res.json({
      message: 'Información logística actualizada',
      order
    });
  },

  async getDetails(req, res) {
    const details = await orderLogisticsService.getDetails(
      req.params.oid,
      req.user
    );

    res.json(details);
  }
};
