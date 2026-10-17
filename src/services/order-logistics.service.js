
import mongoose from 'mongoose';

import Order from '../models/order.model.js';
import Depot from '../models/depot.model.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const EDITABLE_FIELDS = [
  'recipient',
  'deliveryAddress',
  'deliveryAddressDetails',
  'deliveryInstructions',
  'contactlessDelivery',
  'internalNotes',
  'packageInfo',
  'shippingCost',
  'priority',
  'originDepot',
  'requestedDeliveryAt',
  'estimatedDeliveryAt'
];

function fail(code, message) {
  throw new customError(code, message);
}

async function findOrder(id) {
  if (!mongoose.isValidObjectId(id)) {
    fail(ERROR_CODES.VALIDATION_ERROR, 'ID de pedido inválido');
  }

  const order = await Order.findById(id);

  if (!order) {
    fail(ERROR_CODES.ORDER_NOT_FOUND, 'Pedido no encontrado');
  }

  return order;
}

async function validateDepot(id) {
  if (id === null || id === undefined) return;

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

function assertCanRead(order, actor) {
  if (actor?.role === 'admin') return;

  const actorId = actor?.id ?? actor?._id;

  if (
    actor?.role === 'customer' &&
    order.customer.toString() === actorId?.toString()
  ) {
    return;
  }

  fail(ERROR_CODES.FORBIDDEN, 'Acceso no autorizado al pedido');
}

function assertCanEdit(order) {
  if (['delivered', 'cancelled'].includes(order.status)) {
    fail(
      ERROR_CODES.VALIDATION_ERROR,
      'No se puede modificar un pedido finalizado'
    );
  }

  if (order.status !== 'created' || order.delivery) {
    fail(
      ERROR_CODES.VALIDATION_ERROR,
      'Solo pueden modificarse pedidos sin asignar'
    );
  }
}

function recalculateShippingCost(cost) {
  if (!cost) return cost;

  const keys = [
    'baseCost',
    'distanceCost',
    'weightCost',
    'prioritySurcharge',
    'additionalCost'
  ];

  const total = keys.reduce(
    (sum, key) => sum + (Number(cost[key]) || 0),
    0
  );

  return {
    ...cost,
    total: Math.round(total * 100) / 100
  };
}

export const orderLogisticsService = {
  async update(id, data, actor) {
    if (actor?.role !== 'admin') {
      fail(
        ERROR_CODES.FORBIDDEN,
        'Solo un administrador puede modificar la logística'
      );
    }

    const order = await findOrder(id);

    assertCanEdit(order);

    if (data.originDepot) {
      await validateDepot(data.originDepot);
    }

    for (const field of EDITABLE_FIELDS) {
      if (!Object.hasOwn(data, field)) continue;

      if (field === 'shippingCost') {
        order.set(
          field,
          data[field] === null
            ? null
            : recalculateShippingCost(data[field])
        );
      } else {
        order.set(field, data[field]);
      }
    }

    await order.save();

    return order;
  },

  async getDetails(id, actor) {
    const order = await findOrder(id);

    assertCanRead(order, actor);

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      statusHistory: order.statusHistory,
      customer: order.customer,
      recipient: order.recipient,
      deliveryAddress: order.deliveryAddress,
      deliveryAddressDetails: order.deliveryAddressDetails,
      deliveryInstructions: order.deliveryInstructions,
      contactlessDelivery: order.contactlessDelivery,
      internalNotes:
        actor.role === 'admin' ? order.internalNotes : undefined,
      items: order.items,
      packageInfo: order.packageInfo,
      total: order.total,
      shippingCost: order.shippingCost,
      priority: order.priority,
      originDepot: order.originDepot,
      delivery: order.delivery,
      requestedDeliveryAt: order.requestedDeliveryAt,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      pickedUpAt: order.pickedUpAt,
      inTransitAt: order.inTransitAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }
};
