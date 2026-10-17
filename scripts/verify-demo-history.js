
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

try {
  if (!process.env.MONGO_URL) throw new Error('Falta MONGO_URL');
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });
  if (mongoose.connection.name !== 'deliveryops-demo') {
    throw new Error(`Base incorrecta: ${mongoose.connection.name}`);
  }

  const orders = await Order.collection.find({
    trackingCode: /^DOPS-DEMO-\d{4}$/
  }).toArray();
  const deliveries = await Delivery.collection.find({
    trackingCode: /^DOPD-DEMO-\d{4}$/
  }).toArray();

  if (orders.length !== 90 || deliveries.length !== 63) {
    throw new Error(`Cantidad inesperada: ${orders.length} pedidos y ${deliveries.length} entregas (se esperan 90 y 63)`);
  }

  const linked = new Map(deliveries.map(item => [String(item.order), item]));
  for (const order of orders) {
    const delivery = linked.get(String(order._id));
    if (['created', 'cancelled'].includes(order.status)) {
      if (delivery) throw new Error(`Pedido sin asignar tiene entrega: ${order.trackingCode}`);
    } else if (!delivery || delivery.status !== order.status || String(order.delivery) !== String(delivery._id)) {
      throw new Error(`Estado o vinculo inconsistente: ${order.trackingCode}`);
    }
    if (!(order.createdAt instanceof Date) || !(order.updatedAt instanceof Date)) {
      throw new Error(`Pedido sin fechas validas: ${order.trackingCode}`);
    }
    if (order.createdAt > order.updatedAt) {
      throw new Error(`Fechas invertidas: ${order.trackingCode}`);
    }
  }

  const now = Date.now();
  const daysAgo = date => (now - new Date(date).getTime()) / 86_400_000;
  const recent14 = orders.filter(order => daysAgo(order.createdAt) <= 14).length;
  const older45 = orders.filter(order => daysAgo(order.createdAt) > 45).length;
  const days = new Set(orders.map(order => new Date(order.createdAt).toISOString().slice(0, 10)));

  console.log('DEMO HISTORICA VERIFICADA');
  console.log({
    pedidos: orders.length,
    entregas: deliveries.length,
    pedidosUltimos14Dias: recent14,
    pedidosMasAntiguos45Dias: older45,
    diasConActividad: days.size
  });
  if (recent14 < 10 || older45 < 10 || days.size < 20) {
    throw new Error('La distribucion temporal todavia no es suficientemente variada');
  }
} catch (error) {
  console.error(`ERROR DE VERIFICACION: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
