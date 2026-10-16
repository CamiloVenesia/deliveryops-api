
import mongoose from 'mongoose';

import { depotRepository } from '../repositories/depot.repository.js';
import Order from '../models/order.model.js';
import Delivery from '../models/delivery.model.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function fail(code, message) {
  throw new customError(code, message);
}

async function findDepot(id) {
  if (!mongoose.isValidObjectId(id)) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'ID de depósito inválido');
  }

  const depot = await depotRepository.findById(id);

  if (!depot) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'Depósito no encontrado');
  }

  return depot;
}

async function assertUniqueCode(code, excludeId = null) {
  if (!code) return;

  const existing = await depotRepository.findByCode(code);

  if (
    existing &&
    (!excludeId || existing._id.toString() !== excludeId.toString())
  ) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'El código de depósito ya existe');
  }
}

export const depotService = {
  async getAll(query = {}) {
    const page = Number(query.page) || 1;
    const limit = Math.min(50, Number(query.limit) || 20);

    const filter = {};

    if (query.active !== undefined) {
      filter.active = query.active === 'true';
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { code: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      depotRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit
      }),
      depotRepository.count(filter)
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  },

  getById(id) {
    return findDepot(id);
  },

  async create(data) {
    await assertUniqueCode(data.code);

    return depotRepository.create(data);
  },

  async update(id, data) {
    const depot = await findDepot(id);

    if (data.code !== undefined) {
      await assertUniqueCode(data.code, depot._id);
    }

    // Merge de dirección y contacto sin perder campos anteriores.
    const {
      address,
      contact,
      ...fields
    } = data;

    Object.assign(depot, fields);

    if (address !== undefined) {
      depot.address = {
        ...depot.address.toObject(),
        ...address
      };
    }

    if (contact !== undefined) {
      depot.contact = contact === null
        ? null
        : {
            ...(depot.contact?.toObject() ?? {}),
            ...contact
          };
    }

    return depotRepository.save(depot);
  },

  async remove(id) {
    const depot = await findDepot(id);

    // Evitar eliminar un depósito con operaciones relacionadas.
    const linkedOrders = await Order.countDocuments({
      $or: [
        { originDepot: depot._id },
        { destinationDepot: depot._id }
      ]
    });

    const linkedDeliveries = await Delivery.countDocuments({
      $or: [
        { originDepot: depot._id },
        { destinationDepot: depot._id }
      ]
    });

    if (linkedOrders > 0 || linkedDeliveries > 0) {
      // Conservamos la referencia histórica del depósito.
      depot.active = false;
      await depotRepository.save(depot);

      return {
        deleted: false,
        deactivated: true,
        message: 'Depósito desactivado porque tiene operaciones relacionadas'
      };
    }

    await depotRepository.deleteById(depot._id);

    return {
      deleted: true,
      deactivated: false,
      message: 'Depósito eliminado'
    };
  }
};
