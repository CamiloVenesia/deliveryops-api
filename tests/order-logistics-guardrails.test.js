
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createActor(role) {
  const password = 'PasswordSeguro123!';
  const user = await User.create({
    firstName: 'Test', lastName: 'Pedidos',
    email: `${role}-${randomUUID()}@example.test`,
    password: await bcrypt.hash(password, 10), role
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });
  expect(login.status).to.equal(200);
  return { user, token: login.body.accessToken };
}

async function fixture(status = 'created') {
  const admin = await createActor('admin');
  const customer = await createActor('customer');
  const order = await Order.create({
    customer: customer.user.id,
    items: [{ name: 'Producto', quantity: 1, price: 1500 }],
    deliveryAddress: 'San Juan 1200, Rosario',
    internalNotes: 'Información privada del operador',
    total: 1500, status
  });
  return { admin, customer, order };
}

const auth = token => ({ Authorization: `Bearer ${token}` });

describe('Order Logistics - Reglas de integridad', () => {
  it('no muestra notas internas al cliente', async () => {
    const { customer, order } = await fixture();
    const response = await request(app)
      .get(`/api/orders/${order.id}/logistics`)
      .set(auth(customer.token));
    expect(response.status).to.equal(200);
    expect(response.body).not.to.have.property('internalNotes');
  });

  it('permite consultar notas internas al administrador', async () => {
    const { admin, order } = await fixture();
    const response = await request(app)
      .get(`/api/orders/${order.id}/logistics`)
      .set(auth(admin.token));
    expect(response.status).to.equal(200);
    expect(response.body.internalNotes).to.equal('Información privada del operador');
  });

  it('rechaza un depósito inexistente sin modificar el pedido', async () => {
    const { admin, order } = await fixture();
    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(auth(admin.token))
      .send({ originDepot: new mongoose.Types.ObjectId().toString() });
    expect(response.status).to.equal(400);
    const saved = await Order.findById(order.id);
    expect(saved.originDepot).to.be.null;
  });

  it('rechaza costos negativos', async () => {
    const { admin, order } = await fixture();
    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(auth(admin.token))
      .send({ shippingCost: { baseCost: -100 } });
    expect(response.status).to.equal(400);
  });

  it('no modifica pedidos con una entrega asociada', async () => {
    const { admin, order } = await fixture();
    const delivery = await Delivery.create({
      order: order.id,
      status: 'pending'
    });
    order.delivery = delivery.id;
    await order.save();

    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(auth(admin.token))
      .send({ deliveryInstructions: 'Cambio tardío' });

    expect(response.status).to.equal(400);
    const saved = await Order.findById(order.id);
    expect(saved.deliveryInstructions).not.to.equal('Cambio tardío');
  });

  it('no modifica pedidos entregados', async () => {
    const { admin, order } = await fixture('delivered');
    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(auth(admin.token))
      .send({ deliveryInstructions: 'Cambio tardío' });
    expect(response.status).to.equal(400);
  });
});
