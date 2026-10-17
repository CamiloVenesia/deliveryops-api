
import mongoose from 'mongoose';

import Delivery from '../models/delivery.model.js';
import Order from '../models/order.model.js';
import Depot from '../models/depot.model.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const TERMINAL_STATUSES = ['delivered', 'cancelled'];

const TRACKABLE_STATUSES = ['assigned', 'in_transit'];

const OPERATIONAL_FIELDS = [
  'priority',
  'originDepot',
  'vehicle',
  'route',
  'estimatedDeliveryAt',
  'costs',
  'driverNotes'
];

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

function isAssignedDriver(delivery, actor) {
  return (
    actor?.role === 'driver' &&
    delivery.driver?.toString() === actor.id?.toString()
  );
}

function assertOperator(delivery, actor) {
  if (actor?.role === 'admin' || isAssignedDriver(delivery, actor)) {
    return;
  }

  fail(ERROR_CODES.FORBIDDEN, 'No tiene permiso para operar esta entrega');
}

async function assertCanRead(delivery, actor) {
  if (actor?.role === 'admin' || isAssignedDriver(delivery, actor)) {
    return;
  }

  if (actor?.role === 'customer') {
    const order = await Order.findById(delivery.order)
      .select('customer');

    if (order?.customer?.toString() === actor.id?.toString()) {
      return;
    }
  }

  fail(ERROR_CODES.FORBIDDEN, 'No tiene permiso para consultar esta entrega');
}

function assertNotFinished(delivery) {
  if (TERMINAL_STATUSES.includes(delivery.status)) {
    fail(
      ERROR_CODES.VALIDATION_ERROR,
      'La entrega ya está finalizada'
    );
  }
}

async function validateDepot(id) {
  if (!id) return;

  if (!mongoose.isValidObjectId(id)) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'ID de depósito inválido');
  }

  const depot = await Depot.findById(id);

  if (!depot || !depot.active) {
    fail(
      ERROR_CODES.VALIDATION_ERROR,
      'El depósito no existe o está inactivo'
    );
  }
}

export const deliveryLogisticsService = {
  async getDetails(id, actor) {
    const delivery = await findDelivery(id);

    await assertCanRead(delivery, actor);

    const order = await Order.findById(delivery.order)
      .select(
        'trackingCode customer recipient items deliveryAddress ' +
        'deliveryAddressDetails deliveryInstructions ' +
        'packageInfo priority originDepot status shippingCost'
      );

    return {
      delivery,
      order
    };
  },

  async updateOperations(id, data, actor) {
    if (actor?.role !== 'admin') {
      fail(
        ERROR_CODES.FORBIDDEN,
        'Solo un administrador puede modificar los datos operativos'
      );
    }

    const delivery = await findDelivery(id);

    assertNotFinished(delivery);

    if (
      Object.hasOwn(data, 'originDepot') &&
      data.originDepot
    ) {
      await validateDepot(data.originDepot);
    }

    for (const field of OPERATIONAL_FIELDS) {
      if (Object.hasOwn(data, field)) {
        delivery.set(field, data[field]);
      }
    }

    if (Object.hasOwn(data, 'route') && data.route) {
      delivery.route.calculatedAt = new Date();
    }

    await delivery.save();

    return delivery;
  },

  async registerLocation(id, data, actor) {
    const delivery = await findDelivery(id);

    assertOperator(delivery, actor);

    if (!TRACKABLE_STATUSES.includes(delivery.status)) {
      fail(
        ERROR_CODES.VALIDATION_ERROR,
        'Solo se puede registrar ubicación en una entrega asignada o en tránsito'
      );
    }

    const recordedAt = new Date();

    delivery.currentLocation = {
      latitude: data.latitude,
      longitude: data.longitude
    };

    delivery.locationHistory.push({
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: data.accuracyMeters ?? null,
      speedKph: data.speedKph ?? null,
      heading: data.heading ?? null,
      source: data.source ?? 'gps',
      recordedAt
    });

    await delivery.save();

    return {
      deliveryId: delivery.id,
      currentLocation: delivery.currentLocation,
      locationCount: delivery.locationHistory.length,
      recordedAt
    };
  },

  async getLocations(id, actor) {
    const delivery = await findDelivery(id);

    await assertCanRead(delivery, actor);

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      currentLocation: delivery.currentLocation,
      locationHistory: delivery.locationHistory
    };
  },

  async registerProof(id, data, actor) {
    const delivery = await findDelivery(id);

    assertOperator(delivery, actor);

    if (delivery.status !== 'in_transit') {
      fail(
        ERROR_CODES.VALIDATION_ERROR,
        'La entrega debe estar en tránsito para registrar el comprobante'
      );
    }

    if (delivery.proofOfDelivery?.receivedAt) {
      fail(
        ERROR_CODES.VALIDATION_ERROR,
        'Esta entrega ya tiene un comprobante registrado'
      );
    }

    const receivedAt = new Date();

    delivery.proofOfDelivery = {
      ...data,
      receivedAt
    };

    await delivery.save();

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      proofOfDelivery: delivery.proofOfDelivery
    };
  },

  async getProof(id, actor) {
    const delivery = await findDelivery(id);

    await assertCanRead(delivery, actor);

    return {
      deliveryId: delivery.id,
      proofOfDelivery: delivery.proofOfDelivery
    };
  }
};
