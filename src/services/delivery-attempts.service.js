
import mongoose from 'mongoose';
import Delivery from '../models/delivery.model.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function fail(code, message) {
  throw new customError(code, message);
}

async function findDelivery(id) {
  if (!mongoose.isValidObjectId(id)) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'ID de entrega inválido');
  }

  const delivery = await Delivery.findById(id);

  if (!delivery) {
    fail(ERROR_CODES.DELIVERY_NOT_FOUND, 'Entrega no encontrada');
  }

  return delivery;
}

function checkAccess(delivery, actor) {
  const isAdmin = actor?.role === 'admin';
  const isDriver = actor?.role === 'driver' &&
    delivery.driver?.toString() === actor.id?.toString();

  if (!isAdmin && !isDriver) {
    fail(ERROR_CODES.FORBIDDEN, 'Acceso no autorizado a la entrega');
  }
}

export const deliveryAttemptsService = {
  async register(id, data, actor) {
    const delivery = await findDelivery(id);

    checkAccess(delivery, actor);

    if (!['assigned', 'in_transit'].includes(delivery.status)) {
      fail(
        ERROR_CODES.VALIDATION_ERROR,
        'No se pueden registrar intentos en este estado'
      );
    }

    const attemptedAt = new Date();

    delivery.deliveryAttempts.push({
      outcome: data.outcome,
      notes: data.notes ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      attemptedAt
    });

    await delivery.save();

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      attempts: delivery.deliveryAttempts
    };
  },

  async getAll(id, actor) {
    const delivery = await findDelivery(id);

    checkAccess(delivery, actor);

    return {
      deliveryId: delivery.id,
      attempts: delivery.deliveryAttempts
    };
  }
};
