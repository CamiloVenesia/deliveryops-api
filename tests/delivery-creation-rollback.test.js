
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function userWithToken(role) {
  const password = 'PasswordSeguro123!';
  const user = await User.create({
    firstName: 'Test', lastName: 'Rollback',
    email: `${role}-${randomUUID()}@example.test`,
    password: await bcrypt.hash(password, 10), role
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });

  expect(login.status).to.equal(200);
  return { user, token: login.body.accessToken };
}

async function orderFixture() {
  const admin = await userWithToken('admin');
  const customer = await userWithToken('customer');
  const driver = await userWithToken('driver');
  const order = await Order.create({
    customer: customer.user.id,
    items: [{ name: 'Caja', quantity: 1, price: 1200 }],
    deliveryAddress: 'San Martín 100, Rosario',
    total: 1200, status: 'created'
  });
  return { admin, customer, driver, order };
}

describe('Delivery Creation - Consistencia', () => {
  it('no asigna el pedido cuando el vehículo es inválido', async () => {
    const { admin, driver, order } = await orderFixture();
    const response = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ order: order.id, driver: driver.user.id,
        vehicle: { type: 'helicopter' } });

    expect(response.status).to.equal(400);
    expect(await Delivery.countDocuments({ order: order.id })).to.equal(0);
    const saved = await Order.findById(order.id);
    expect(saved.status).to.equal('created');
    expect(saved.delivery).to.be.null;
  });

  it('rechaza tracking duplicado antes de modificar el pedido', async () => {
    const { admin, driver, order } = await orderFixture();
    const otherOrder = await Order.create({
      customer: order.customer,
      items: [{ name: 'Otra caja', quantity: 1, price: 100 }],
      deliveryAddress: 'Roca 200, Rosario', total: 100
    });
    await Delivery.create({
      order: otherOrder.id, driver: driver.user.id,
      status: 'assigned', trackingCode: 'DOPD-DUPLICADO'
    });

    const response = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ order: order.id, driver: driver.user.id,
        trackingCode: 'DOPD-DUPLICADO' });

    expect(response.status).to.equal(400);
    expect(await Delivery.countDocuments({ order: order.id })).to.equal(0);
    const saved = await Order.findById(order.id);
    expect(saved.status).to.equal('created');
    expect(saved.delivery).to.be.null;
  });

  it('revierte la asignación si falla el segundo guardado', async () => {
    const { admin, driver, order } = await orderFixture();
    const originalSave = Delivery.prototype.save;

    Delivery.prototype.save = function (...args) {
      if (!this.isNew && this.trackingCode === 'DOPD-ROLLBACK-TEST') {
        return Promise.reject(new Error('Fallo simulado al guardar logística'));
      }
      return originalSave.apply(this, args);
    };

    let response;
    try {
      response = await request(app)
        .post('/api/deliveries')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ order: order.id, driver: driver.user.id,
          trackingCode: 'DOPD-ROLLBACK-TEST' });
    } finally {
      Delivery.prototype.save = originalSave;
    }

    expect(response.status).to.equal(500);
    expect(await Delivery.countDocuments({ order: order.id })).to.equal(0);
    const saved = await Order.findById(order.id);
    expect(saved.delivery).to.be.null;
    expect(saved.status).to.equal('created');
  });
});
