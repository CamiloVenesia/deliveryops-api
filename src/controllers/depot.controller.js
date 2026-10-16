
import { depotService } from '../services/depot.service.js';
import { depotListQuerySchema } from '../validators/depot.schemas.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const depotController = {
  async getAll(req, res) {
    const parsed = depotListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new customError(
        ERROR_CODES.VALIDATION_ERROR,
        'Parámetros de búsqueda inválidos'
      );
    }

    const result = await depotService.getAll(parsed.data);

    res.json(result);
  },

  async getById(req, res) {
    const depot = await depotService.getById(req.params.did);

    res.json(depot);
  },

  async create(req, res) {
    const depot = await depotService.create(req.body);

    res.status(201).json(depot);
  },

  async update(req, res) {
    const depot = await depotService.update(
      req.params.did,
      req.body
    );

    res.json(depot);
  },

  async remove(req, res) {
    const result = await depotService.remove(req.params.did);

    res.json(result);
  }
};
