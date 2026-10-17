
import { analyticsService } from '../services/analytics.service.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const analyticsController = {
  async getDashboard(req, res) {
    const rawDays = req.query.days;

    let days = 14;

    if (rawDays !== undefined) {
      if (
        typeof rawDays !== 'string' ||
        !/^[0-9]+$/.test(rawDays)
      ) {
        throw new customError(
          ERROR_CODES.VALIDATION_ERROR,
          'El período debe ser un número entero entre 1 y 90 días'
        );
      }

      days = Number(rawDays);

      if (!Number.isInteger(days) || days < 1 || days > 90) {
        throw new customError(
          ERROR_CODES.VALIDATION_ERROR,
          'El período debe estar entre 1 y 90 días'
        );
      }
    }

    const dashboard = await analyticsService.getDashboard(days);

    res.json(dashboard);
  }
};
