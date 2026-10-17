
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
    lastName: 'Analytics',
    email: `${role}-${randomUUID()}@example.test`,
    password: await bcrypt.hash(password, 10),
    role
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password
    });

  expect(login.status).to.equal(200);

  return {
    user,
    token: login.body.accessToken
  };
}

function auth(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function createOrder(customerId, status, options = {}) {
  return Order.create({
    customer: customerId,
    items: [
      {
        name: 'Producto de prueba',
        quantity: 1,
        price: 1000
      }
    ],
    deliveryAddress: 'San Martín 1000, Rosario',
    total: 1000,
    status,
    ...options
  });
}

describe('Analytics Dashboard API', () => {
  it('debería exigir autenticación', async () => {
    const response = await request(app)
      .get('/api/analytics/dashboard');

    expect(response.status).to.equal(401);
  });

  it('debería impedir el acceso a clientes', async () => {
    const customer = await createActor('customer');

    const response = await request(app)
      .get('/api/analytics/dashboard')
      .set(auth(customer.token));

    expect(response.status).to.equal(403);
  });

  it('debería mostrar estadísticas vacías para un administrador', async () => {
    const admin = await createActor('admin');

    const response = await request(app)
      .get('/api/analytics/dashboard')
      .set(auth(admin.token));

    expect(response.status).to.equal(200);
    expect(response.body.overview.ordersTotal).to.equal(0);
    expect(response.body.overview.ordersDelivered).to.equal(0);
    expect(response.body.overview.deliveryRate).to.be.null;
    expect(response.body.activity.daily).to.have.length(14);
    expect(response.body.period.timezone).to.equal('UTC');
  });

  it('debería calcular métricas reales desde MongoDB', async () => {
    const admin = await createActor('admin');
    const customer = await createActor('customer');
    const driver = await createActor('driver');

    await createOrder(customer.user.id, 'created');

    await createOrder(customer.user.id, 'cancelled');

    const deliveredOrder = await createOrder(
      customer.user.id,
      'delivered',
      {
        shippingCost: {
          currency: 'ARS',
          baseCost: 350,
          total: 350
        }
      }
    );

    const now = new Date();
    const assignedAt = new Date(now.getTime() - 3600000);

    await Delivery.create({
      order: deliveredOrder.id,
      driver: driver.user.id,
      status: 'delivered',
      assignedAt,
      deliveredAt: now,
      costs: {
        currency: 'ARS',
        fuelCost: 150,
        totalActualCost: 150
      }
    });

    const response = await request(app)
      .get('/api/analytics/dashboard?days=7')
      .set(auth(admin.token));

    expect(response.status).to.equal(200);

    const overview = response.body.overview;

    expect(overview.ordersTotal).to.equal(3);
    expect(overview.ordersActive).to.equal(1);
    expect(overview.ordersDelivered).to.equal(1);
    expect(overview.ordersCancelled).to.equal(1);
    expect(overview.deliveriesDelivered).to.equal(1);
    expect(overview.deliveryRate).to.equal(50);
    expect(overview.averageDeliveryMinutes).to.equal(60);

    expect(
      response.body.finances.shippingRevenueByCurrency.ARS
    ).to.equal(350);

    expect(
      response.body.finances.deliveryCostsByCurrency.ARS
    ).to.equal(150);

    expect(response.body.activity.daily).to.have.length(7);
    expect(response.body.activity.recentOrders).to.have.length(3);
  });

  it('debería rechazar períodos inválidos', async () => {
    const admin = await createActor('admin');

    for (const days of ['0', '91', 'abc', '-1', '1.5']) {
      const response = await request(app)
        .get(`/api/analytics/dashboard?days=${days}`)
        .set(auth(admin.token));

      expect(response.status).to.equal(400);
    }
  });
});
