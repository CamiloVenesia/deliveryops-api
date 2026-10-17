
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import app from '../src/app.js';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import Depot from '../src/models/depot.model.js';

async function createUser(role) {
  const password = 'PasswordSeguro123!';

  const user = await User.create({
    firstName: 'Usuario',
    lastName: 'DeliveryOps',
    email: `${role}-${randomUUID()}@test.com`,
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

function auth(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function createOrder(customerId, options = {}) {
  return Order.create({
    customer: customerId,
    items: [
      {
        name: 'Producto logístico',
        quantity: 2,
        price: 1500
      }
    ],
    deliveryAddress: 'San Martín 1500, Rosario',
    total: 3000,
    status: 'created',
    ...options
  });
}

async function createDepot() {
  return Depot.create({
    name: 'Depósito Logístico Rosario',
    code: `ROS-${randomUUID().slice(0, 8)}`,
    address: {
      street: 'Córdoba',
      number: '1000',
      city: 'Rosario',
      province: 'Santa Fe'
    },
    active: true
  });
}

async function createFixture(options = {}) {
  const admin = await createUser('admin');
  const customer = await createUser('customer');
  const driver = await createUser('driver');

  const order = await createOrder(
    customer.user.id,
    options
  );

  return {
    admin,
    customer,
    driver,
    order
  };
}

describe('Delivery Creation Logistics API', () => {
  it('debería crear una entrega con datos logísticos completos', async () => {
    const fixture = await createFixture();
    const depot = await createDepot();

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.admin.token))
      .send({
        order: fixture.order.id,
        driver: fixture.driver.user.id,
        priority: 'high',
        originDepot: depot.id,
        vehicle: {
          type: 'motorcycle',
          plate: 'A123BCD',
          description: 'Moto de reparto'
        },
        route: {
          origin: {
            latitude: -32.94,
            longitude: -60.63
          },
          destination: {
            latitude: -32.96,
            longitude: -60.65
          },
          distanceKm: 5.5,
          estimatedDurationMinutes: 20
        },
        costs: {
          currency: 'ARS',
          plannedCost: 2500,
          fuelCost: 500,
          tollCost: 100
        },
        driverNotes: 'Llamar al destinatario'
      });

    expect(response.status).to.equal(201);

    const delivery = await Delivery.findById(
      response.body._id
    );

    expect(delivery).to.exist;
    expect(delivery.status).to.equal('assigned');
    expect(delivery.priority).to.equal('high');
    expect(delivery.originDepot.toString()).to.equal(depot.id);
    expect(delivery.vehicle.type).to.equal('motorcycle');
    expect(delivery.route.distanceKm).to.equal(5.5);
    expect(delivery.costs.plannedCost).to.equal(2500);
    expect(delivery.driverNotes).to.equal(
      'Llamar al destinatario'
    );
    expect(delivery.trackingCode).to.be.a('string');
    expect(delivery.statusHistory).to.have.length(1);

    const order = await Order.findById(fixture.order.id);

    expect(order.status).to.equal('assigned');
    expect(order.delivery.toString()).to.equal(delivery.id);
  });

  it('debería heredar el depósito del pedido', async () => {
    const depot = await createDepot();
    const fixture = await createFixture({
      originDepot: depot.id
    });

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.admin.token))
      .send({
        order: fixture.order.id,
        driver: fixture.driver.user.id
      });

    expect(response.status).to.equal(201);

    const saved = await Delivery.findById(response.body._id);

    expect(saved.originDepot.toString()).to.equal(depot.id);
  });

  it('debería mantener la creación simple anterior', async () => {
    const fixture = await createFixture();

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.admin.token))
      .send({
        order: fixture.order.id,
        driver: fixture.driver.user.id,
        priority: 'normal'
      });

    expect(response.status).to.equal(201);
    expect(response.body.status).to.equal('assigned');

    const order = await Order.findById(fixture.order.id);

    expect(order.status).to.equal('assigned');
    expect(order.delivery.toString()).to.equal(
      response.body._id
    );
  });

  it('debería rechazar un depósito inactivo sin asignar el pedido', async () => {
    const fixture = await createFixture();
    const depot = await createDepot();

    depot.active = false;
    await depot.save();

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.admin.token))
      .send({
        order: fixture.order.id,
        driver: fixture.driver.user.id,
        originDepot: depot.id
      });

    expect(response.status).to.equal(400);

    const order = await Order.findById(fixture.order.id);

    expect(order.status).to.equal('created');
    expect(order.delivery).to.be.null;

    const deliveries = await Delivery.countDocuments({
      order: fixture.order.id
    });

    expect(deliveries).to.equal(0);
  });

  it('debería impedir asignar un usuario que no es repartidor', async () => {
    const fixture = await createFixture();

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.admin.token))
      .send({
        order: fixture.order.id,
        driver: fixture.customer.user.id
      });

    expect(response.status).to.equal(400);
  });

  it('debería impedir que un customer cree entregas', async () => {
    const fixture = await createFixture();

    const response = await request(app)
      .post('/api/deliveries')
      .set(auth(fixture.customer.token))
      .send({
        order: fixture.order.id,
        driver: fixture.driver.user.id
      });

    expect(response.status).to.equal(403);
  });

  it('debería responder 401 sin autenticación', async () => {
    const response = await request(app)
      .post('/api/deliveries')
      .send({
        order: '64b000000000000000000001',
        driver: '64b000000000000000000002'
      });

    expect(response.status).to.equal(401);
  });
});
