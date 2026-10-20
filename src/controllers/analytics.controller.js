
import {
  analyticsService
} from '../services/analytics.service.js';

import {
  operationsIntelligenceService
} from '../services/operations-intelligence.service.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function parseDays(rawDays, fallback) {
  if (rawDays === undefined) {
    return fallback;
  }

  if (
    typeof rawDays !== 'string' ||
    !/^[0-9]+$/.test(rawDays)
  ) {
    throw new customError(
      ERROR_CODES.VALIDATION_ERROR,
      'El período debe ser un número entero entre 1 y 90 días'
    );
  }

  const days = Number(rawDays);

  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 90
  ) {
    throw new customError(
      ERROR_CODES.VALIDATION_ERROR,
      'El período debe estar entre 1 y 90 días'
    );
  }

  return days;
}

export const analyticsController = {
  async getDashboard(req, res) {
    const days = parseDays(req.query.days, 14);

    const dashboard =
      await analyticsService.getDashboard(days);

    res.json(dashboard);
  },

  async getOperations(req, res) {
    const days = parseDays(req.query.days, 30);

    const operations =
      await operationsIntelligenceService.getOverview(days);

    res.json(operations);
  }
};
