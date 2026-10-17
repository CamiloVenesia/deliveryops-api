
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

// Solo datos sinteticos de DeliveryOps; nunca toca Kinetic Gym.
const DB_NAME = 'deliveryops-demo';
const VERSION = 'portfolio-90d-v1';
const TARGET = 90;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

function random(index, salt = 1) {
  let n = ((index * 1664525 + salt * 1013904223) >>> 0);
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  return (n >>> 0) / 4294967296;
}

function numberBetween(index, salt, min, max) {
  return min + Math.floor(random(index, salt) * (max - min + 1));
}

function orderCode(n) {
  return `DOPS-DEMO-${String(n).padStart(4, '0')}`;
}

function deliveryCode(n) {
  return `DOPD-DEMO-${String(n).padStart(4, '0')}`;
}

function initialDate(n) {
  let daysAgo;
  if (n <= 10) daysAgo = numberBetween(n, 17, 0, 2);
  else if (n <= 35) daysAgo = numberBetween(n, 18, 3, 14);
  else if (n <= 65) daysAgo = numberBetween(n, 19, 15, 44);
  else daysAgo = numberBetween(n, 20, 45, 95);

  // Variacion horaria compatible con UTC-3 (Rosario).
  // Para pedidos de hoy, retrocedemos varias horas para dar tiempo a las etapas.
  if (daysAgo === 0) {
    return new Date(now - numberBetween(n, 21, 4, 11) * HOUR - numberBetween(n, 22, 0, 59) * 60_000);
  }

  const date = new Date(now - daysAgo * DAY);
  date.setUTCHours(numberBetween(n, 23, 11, 23), numberBetween(n, 24, 0, 59), 0, 0);
  return date;
}

function lifecycle(status, base, actor, orderType) {
  const stages = orderType ? ['created'] : ['assigned'];
  if (orderType && ['assigned', 'in_transit', 'delivered'].includes(status)) stages.push('assigned');
  if (['in_transit', 'delivered'].includes(status)) stages.push('in_transit');
  if (status === 'delivered') stages.push('delivered');
  if (status === 'cancelled') stages.push('cancelled');

  const minute = orderType
    ? { created: 0, assigned: 22, in_transit: 68, delivered: 144, cancelled: 36 }
    : { assigned: 24, in_transit: 68, delivered: 144, cancelled: 36 };

  return stages.map((to, i) => ({
    from: i ? stages[i - 1] : null,
    to,
    changedBy: actor ?? null,
    changedByRole: actor ? 'admin' : 'system',
    source: 'system',
    changedAt: new Date(base.getTime() + minute[to] * 60_000)
  }));
}

function hasManualActivity(order, delivery) {
  if (order.receipt?.uploadedAt || delivery?.receipt?.uploadedAt) return true;
  const changes = [
    ...(order.statusHistory ?? []),
    ...(delivery?.statusHistory ?? [])
  ];
  return changes.some(event => event.source && event.source !== 'system');
}

function orderTiming(order, base) {
  const actor = order.statusHistory?.[0]?.changedBy ?? null;
  const statusHistory = lifecycle(order.status, base, actor, true);
  const at = key => statusHistory.find(event => event.to === key)?.changedAt ?? null;
  return {
    createdAt: base,
    updatedAt: statusHistory.at(-1)?.changedAt ?? base,
    statusHistory,
    inTransitAt: at('in_transit'),
    deliveredAt: at('delivered'),
    cancelledAt: at('cancelled')
  };
}

function deliveryTiming(delivery, base, actor) {
  const history = lifecycle(delivery.status, base, actor, false);
  const at = key => history.find(event => event.to === key)?.changedAt ?? null;
  const startedAt = at('in_transit');
  const deliveredAt = at('delivered');
  const result = {
    createdAt: new Date(base.getTime() + 24 * 60_000),
    updatedAt: history.at(-1)?.changedAt ?? base,
    assignedAt: at('assigned'),
    inTransitAt: startedAt,
    deliveredAt,
    cancelledAt: at('cancelled'),
    statusHistory: history
  };

  if (delivery.route) {
    result.route = {
      ...delivery.route,
      calculatedAt: at('assigned')
    };
  }

  if (delivery.locationHistory?.length && startedAt) {
    result.locationHistory = delivery.locationHistory.map((point, i) => ({
      ...point,
      recordedAt: new Date(startedAt.getTime() + (8 + i * 17) * 60_000)
    }));
  }

  if (delivery.deliveryAttempts?.length) {
    result.deliveryAttempts = delivery.deliveryAttempts.map((attempt, i) => ({
      ...attempt,
      attemptedAt: new Date(base.getTime() + (50 + i * 18) * 60_000)
    }));
  }

  if (delivery.proofOfDelivery?.receivedAt && deliveredAt) {
    result.proofOfDelivery = {
      ...delivery.proofOfDelivery,
      receivedAt: deliveredAt
    };
  }
  return result;
}

async function insertExtra(n, templateOrder, templateDelivery) {
  const existing = await Order.collection.findOne({ trackingCode: orderCode(n) });
  if (existing) return;

  const id = new mongoose.Types.ObjectId();
  const { _id: ignoredOrderId, ...sourceOrder } = templateOrder;
  void ignoredOrderId;
  const clone = {
    ...sourceOrder,
    _id: id,
    trackingCode: orderCode(n),
    delivery: null,
    receipt: null,
    notifications: [],
    statusHistory: []
  };
  await Order.collection.insertOne(clone);

  if (!['created', 'cancelled'].includes(clone.status)) {
    if (!templateDelivery) {
      throw new Error(`No hay plantilla de entrega para ${orderCode(n)}`);
    }
    const deliveryId = new mongoose.Types.ObjectId();
    const { _id: ignoredDeliveryId, ...sourceDelivery } = templateDelivery;
    void ignoredDeliveryId;
    const delivery = {
      ...sourceDelivery,
      _id: deliveryId,
      trackingCode: deliveryCode(n),
      order: id,
      receipt: null,
      notifications: [],
      proofOfDelivery: sourceDelivery.proofOfDelivery?.receivedAt
        ? { ...sourceDelivery.proofOfDelivery, photoUrls: [], signatureUrl: null }
        : null,
      statusHistory: []
    };
    await Delivery.collection.insertOne(delivery);
    await Order.collection.updateOne({ _id: id }, { $set: { delivery: deliveryId } });
  }
}

async function run() {
  if (!process.env.MONGO_URL) throw new Error('Falta MONGO_URL en .env');
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });
  if (mongoose.connection.name !== DB_NAME) {
    throw new Error(`SEGURIDAD: conectaste a ${mongoose.connection.name}; solo se admite ${DB_NAME}`);
  }

  const originals = [];
  for (let n = 1; n <= 30; n++) {
    const order = await Order.collection.findOne({ trackingCode: orderCode(n) });
    if (!order) throw new Error(`Falta el pedido demo original ${orderCode(n)}`);
    originals.push(order);
  }
  const originalDeliveries = await Delivery.collection.find({
    order: { $in: originals.map(order => order._id) }
  }).toArray();
  const deliveriesByOrder = new Map(originalDeliveries.map(item => [String(item.order), item]));
  if (originalDeliveries.length !== 21) {
    throw new Error(`Se esperaban 21 entregas demo originales, hay ${originalDeliveries.length}`);
  }

  const apply = process.argv.includes('--apply');
  console.log(`Base confirmada: ${DB_NAME}. Preparado para ${TARGET} pedidos demo (30 actuales + 60 adicionales).`);
  console.log('Solo se alteran registros con codigos DOPS-DEMO- y DOPD-DEMO-.');
  if (!apply) {
    console.log('SIMULACION. Para aplicar: node scripts/refresh-demo-history.js --apply');
    return;
  }

  for (let n = 31; n <= TARGET; n++) {
    const template = originals[(n - 31) % originals.length];
    const templateDelivery = deliveriesByOrder.get(String(template._id));
    await insertExtra(n, template, templateDelivery);
  }

  let shifted = 0;
  let preserved = 0;
  for (let n = 1; n <= TARGET; n++) {
    const order = await Order.collection.findOne({ trackingCode: orderCode(n) });
    const delivery = order.delivery
      ? await Delivery.collection.findOne({ _id: order.delivery })
      : await Delivery.collection.findOne({ order: order._id });

    if (order.demoTimelineVersion === VERSION || hasManualActivity(order, delivery)) {
      preserved++;
      continue;
    }

    const base = initialDate(n);
    const orderDates = orderTiming(order, base);
    await Order.collection.updateOne({ _id: order._id }, {
      $set: { ...orderDates, demoTimelineVersion: VERSION }
    });

    if (delivery) {
      const actor = orderDates.statusHistory[0]?.changedBy ?? null;
      const deliveryDates = deliveryTiming(delivery, base, actor);
      await Delivery.collection.updateOne({ _id: delivery._id }, {
        $set: { ...deliveryDates, demoTimelineVersion: VERSION }
      });
    }
    shifted++;
  }

  console.log(`DEMO ACTUALIZADA: ${TARGET} pedidos, ${shifted} con fechas distribuidas, ${preserved} conservados.`);
  console.log('Rango simulado: aproximadamente los ultimos 95 dias. Sin modificar otros pedidos ni usuarios.');
  console.log('Nota: verify-demo.js original espera 30 pedidos; despues de ampliar la demo, no lo ejecutes sin adaptarlo.');
}

try {
  await run();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
