
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import User from '../src/models/user.model.js';
import Depot from '../src/models/depot.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function main() {
  if (!process.env.MONGO_URL) {
    throw new Error('Falta MONGO_URL');
  }

  await mongoose.connect(
    process.env.MONGO_URL,
    { serverSelectionTimeoutMS: 10000 }
  );

  if (mongoose.connection.name !== 'deliveryops-demo') {
    throw new Error(
      `La base seleccionada es "${mongoose.connection.name}"; ` +
      'esperaba "deliveryops-demo"'
    );
  }

  const admin = await User.findOne({
    email: 'admin@deliveryops-demo.example.com'
  }).select('+password');

  if (!admin || admin.role !== 'admin') {
    throw new Error('Falta el usuario administrador demo');
  }

  if (
    process.env.DEMO_PASSWORD &&
    !(await bcrypt.compare(
      process.env.DEMO_PASSWORD,
      admin.password
    ))
  ) {
    throw new Error(
      'DEMO_PASSWORD no coincide con la contraseña del administrador demo'
    );
  }

  const orders = await Order.find({
    trackingCode: /^DOPS-DEMO-/
  }).lean();

  const deliveries = await Delivery.find({
    trackingCode: /^DOPD-DEMO-/
  }).lean();

  const depots = await Depot.countDocuments({
    code: /^DEMO-/,
    active: true
  });

  const drivers = await User.countDocuments({
    role: 'driver',
    email: /@deliveryops-demo\.example\.com$/
  });

  if (
    orders.length !== 30 ||
    deliveries.length !== 21 ||
    depots !== 3 ||
    drivers !== 4
  ) {
    throw new Error(
      `Cantidad inesperada: ${orders.length} pedidos, ` +
      `${deliveries.length} entregas, ` +
      `${depots} depósitos, ${drivers} drivers`
    );
  }

  const deliveriesByOrder = new Map(
    deliveries.map(delivery => [
      String(delivery.order),
      delivery
    ])
  );

  const counts = {};

  for (const order of orders) {
    counts[order.status] =
      (counts[order.status] ?? 0) + 1;

    const delivery = deliveriesByOrder.get(
      String(order._id)
    );

    if (
      ['created', 'cancelled'].includes(order.status)
    ) {
      if (delivery || order.delivery) {
        throw new Error(
          `Pedido ${order.trackingCode} sin asignar tiene entrega`
        );
      }
    } else if (
      !delivery ||
      String(order.delivery) !== String(delivery._id) ||
      delivery.status !== order.status
    ) {
      throw new Error(
        `Pedido ${order.trackingCode} tiene vinculación o estado inconsistente`
      );
    }

    if (order.statusHistory.length === 0) {
      throw new Error(
        `Pedido sin historial: ${order.trackingCode}`
      );
    }
  }

  const proofs = deliveries.filter(
    delivery => delivery.proofOfDelivery?.receivedAt
  ).length;

  const locations = deliveries.filter(
    delivery => delivery.locationHistory?.length > 0
  ).length;

  if (proofs !== counts.delivered) {
    throw new Error(
      'No coincide el número de comprobantes y entregas finalizadas'
    );
  }

  console.log('DEMO VERIFICADA');

  console.log({
    pedidos: orders.length,
    entregas: deliveries.length,
    depots,
    drivers,
    estados: counts,
    comprobantes: proofs,
    entregasConGPS: locations
  });
}

try {
  await main();
} catch (error) {
  console.error(
    `ERROR VERIFICACIÓN DEMO: ${error.message}`
  );

  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
