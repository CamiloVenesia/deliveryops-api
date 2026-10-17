
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
    firstName: 'Test', lastName: 'Seguridad',
    email: `${role}-${randomUUID()}@example.test`,
    password: await bcrypt.hash(password, 10), role
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });
  expect(login.status).to.equal(200);
  return { user, token: login.body.accessToken };
}

async function fixture(status = 'in_transit') {
  const customer = await createActor('customer');
  const driver = await createActor('driver');
  const order = await Order.create({
    customer: customer.user.id,
    items: [{ name: 'Paquete', price: 800, quantity: 1 }],
    deliveryAddress: 'Córdoba 800, Rosario',
    total: 800, status: status === 'delivered' ? 'delivered' : 'in_transit'
  });
  const delivery = await Delivery.create({
    order: order.id, driver: driver.user.id, status
  });
  order.delivery = delivery.id;
  await order.save();
  return { customer, driver, order, delivery };
}

const auth = token => ({ Authorization: `Bearer ${token}` });

describe('Delivery Logistics - Seguridad', () => {
  it('impide consultar ubicaciones sin autenticación', async () => {
    const { delivery } = await fixture();
    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/locations`);
    expect(response.status).to.equal(401);
  });

  it('impide que otro cliente vea la logística', async () => {
    const { delivery } = await fixture();
    const other = await createActor('customer');
    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/logistics`)
      .set(auth(other.token));
    expect(response.status).to.equal(403);
  });

  it('impide que otro repartidor consulte el comprobante', async () => {
    const { delivery } = await fixture();
    const other = await createActor('driver');
    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/proof`)
      .set(auth(other.token));
    expect(response.status).to.equal(403);
  });

  it('impide que un cliente registre ubicaciones GPS', async () => {
    const { customer, delivery } = await fixture();
    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(customer.token))
      .send({ latitude: -32.94, longitude: -60.64 });
    expect(response.status).to.equal(403);
  });

  it('impide que el repartidor modifique costos operativos', async () => {
    const { driver, delivery } = await fixture();
    const response = await request(app)
      .patch(`/api/deliveries/${delivery.id}/logistics`)
      .set(auth(driver.token))
      .send({ costs: { plannedCost: 1 } });
    expect(response.status).to.equal(403);
  });

  it('impide al cliente consultar intentos reservados al operador', async () => {
    const { customer, delivery } = await fixture();
    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/attempts`)
      .set(auth(customer.token));
    expect(response.status).to.equal(403);
  });

  it('rechaza GPS con precisión negativa', async () => {
    const { driver, delivery } = await fixture();
    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(driver.token))
      .send({ latitude: -32.94, longitude: -60.64, accuracyMeters: -5 });
    expect(response.status).to.equal(400);
  });

  it('rechaza intentos después de finalizar la entrega', async () => {
    const { driver, delivery } = await fixture('delivered');
    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/attempts`)
      .set(auth(driver.token))
      .send({ outcome: 'recipient_absent' });
    expect(response.status).to.equal(400);
    const saved = await Delivery.findById(delivery.id);
    expect(saved.deliveryAttempts).to.have.length(0);
  });
});
