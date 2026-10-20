
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createActor(role) {
  const password = 'PasswordSeguro123!';

  const user = await User.create({
    firstName: 'Usuario',
    lastName: role,
    email: `${role}-${randomUUID()}@example.test`,
    password: await bcrypt.hash(password, 10),
    role
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password
    });

  expect(response.status).to.equal(200);

  return {
    user,
    token: response.body.accessToken
  };
}

async function createOrder(customerId, status, priority = 'normal') {
  return Order.create({
    customer: customerId,
    items: [
      {
        name: 'Paquete de prueba',
        quantity: 1,
        price: 1000
      }
    ],
    deliveryAddress: 'Rosario, Santa Fe',
    total: 1000,
    status,
    priority
  });
}

function auth(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

describe('Inteligencia operativa API', () => {
  it('exige autenticación y rol administrador', async () => {
    const anonymous = await request(app)
      .get('/api/analytics/operations');

    expect(anonymous.status).to.equal(401);

    const customer = await createActor('customer');

    const restricted = await request(app)
      .get('/api/analytics/operations')
      .set(auth(customer.token));

    expect(restricted.status).to.equal(403);
  });

  it('devuelve indicadores vacíos correctamente', async () => {
    const admin = await createActor('admin');

    const response = await request(app)
      .get('/api/analytics/operations')
      .set(auth(admin.token));

    expect(response.status).to.equal(200);
    expect(response.body.period.days).to.equal(30);
    expect(response.body.alerts.summary.overdue).to.equal(0);
    expect(response.body.alerts.summary.staleInTransit).to.equal(0);
    expect(response.body.alerts.items).to.deep.equal([]);
    expect(response.body.performance.drivers).to.deep.equal([]);
  });

  it('calcula alertas y rendimiento desde MongoDB', async () => {
    const admin = await createActor('admin');
    const customer = await createActor('customer');
    const driver = await createActor('driver');

    const now = Date.now();
    const hoursAgo = hours =>
      new Date(now - hours * 60 * 60 * 1000);

    const priorityOrder = await createOrder(
      customer.user.id,
      'created',
      'high'
    );

    const overdueOrder = await createOrder(
      customer.user.id,
      'assigned'
    );

    const staleOrder = await createOrder(
      customer.user.id,
      'in_transit'
    );

    const deliveredOrder = await createOrder(
      customer.user.id,
      'delivered'
    );

    await Delivery.create({
      order: overdueOrder.id,
      driver: driver.user.id,
      status: 'assigned',
      assignedAt: hoursAgo(8),
      estimatedDeliveryAt: hoursAgo(2)
    });

    const staleDelivery = await Delivery.create({
      order: staleOrder.id,
      driver: driver.user.id,
      status: 'in_transit',
      assignedAt: hoursAgo(50),
      inTransitAt: hoursAgo(48),
      deliveryAttempts: [
        {
          attemptedAt: hoursAgo(4),
          outcome: 'recipient_absent',
          notes: 'Destinatario ausente'
        }
      ]
    });

    // Simula una entrega sin actualizaciones.
    await Delivery.collection.updateOne(
      { _id: staleDelivery._id },
      {
        $set: {
          updatedAt: hoursAgo(48)
        }
      }
    );

    await Delivery.create({
      order: deliveredOrder.id,
      driver: driver.user.id,
      status: 'delivered',
      assignedAt: hoursAgo(2),
      estimatedDeliveryAt: hoursAgo(1.5),
      deliveredAt: hoursAgo(1)
    });

    const response = await request(app)
      .get('/api/analytics/operations?days=7')
      .set(auth(admin.token));

    expect(response.status).to.equal(200);

    const summary = response.body.alerts.summary;

    expect(summary.overdue).to.equal(1);
    expect(summary.staleInTransit).to.equal(1);
    expect(summary.highPriorityOpen).to.equal(1);
    expect(summary.unassignedOrders).to.equal(1);
    expect(summary.incidentsLast7Days).to.equal(1);

    const alerts = response.body.alerts.items;

    expect(alerts.some(item =>
      item.type === 'overdue'
    )).to.equal(true);

    expect(alerts.some(item =>
      item.type === 'stale'
    )).to.equal(true);

    expect(alerts.some(item =>
      item.type === 'high_priority' &&
      item.id === String(priorityOrder._id)
    )).to.equal(true);

    const drivers = response.body.performance.drivers;

    expect(drivers).to.have.length(1);
    expect(drivers[0].completed).to.equal(1);
    expect(drivers[0].averageDeliveryMinutes).to.equal(60);
    expect(drivers[0].evaluatedWithEstimate).to.equal(1);
    expect(drivers[0].onTimeRate).to.equal(0);
  });

  it('rechaza períodos inválidos', async () => {
    const admin = await createActor('admin');

    for (const days of ['0', '91', 'abc', '-1', '1.5']) {
      const response = await request(app)
        .get(`/api/analytics/operations?days=${days}`)
        .set(auth(admin.token));

      expect(response.status).to.equal(400);
    }
  });
});
