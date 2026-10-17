
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Depot from '../src/models/depot.model.js';

async function createUser(role) {
  const password = 'PasswordSeguro123!';

  const user = await User.create({
    firstName: 'Usuario',
    lastName: 'Logistica',
    email: `${role}-${Date.now()}-${Math.random()}@test.com`,
    password: await bcrypt.hash(password, 10),
    role
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });

  expect(response.status).to.equal(200);

  return {
    user,
    token: response.body.accessToken
  };
}

function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createOrder(customerId, overrides = {}) {
  return Order.create({
    customer: customerId,
    items: [
      {
        name: 'Producto de prueba',
        quantity: 2,
        price: 500
      }
    ],
    deliveryAddress: 'San Martín 1200, Rosario',
    total: 1000,
    status: 'created',
    ...overrides
  });
}

describe('Order Logistics API', () => {
  it('debería crear un pedido con destinatario independiente', async () => {
    const { user, token } = await createUser('customer');

    const response = await request(app)
      .post('/api/orders')
      .set(authorization(token))
      .send({
        items: [
          {
            name: 'Auriculares',
            sku: 'AUR-001',
            quantity: 2,
            price: 2500,
            fragile: true
          }
        ],
        deliveryAddress: 'Córdoba 1500, Rosario',
        recipient: {
          fullName: 'María Fernández',
          phone: '3415559876',
          email: 'maria@example.com'
        },
        deliveryAddressDetails: {
          street: 'Córdoba',
          number: '1500',
          city: 'Rosario',
          province: 'Santa Fe',
          floor: '3',
          unit: 'B'
        },
        deliveryInstructions: 'Llamar antes de entregar',
        packageInfo: {
          packageCount: 1,
          fragile: true,
          totalWeightKg: 0.8
        }
      });

    expect(response.status).to.equal(201);

    const order = await Order.findById(response.body.order._id);

    expect(order).to.exist;
    expect(order.customer.toString()).to.equal(user.id);
    expect(order.recipient.fullName).to.equal('María Fernández');
    expect(order.deliveryAddressDetails.floor).to.equal('3');
    expect(order.items[0].sku).to.equal('AUR-001');
    expect(order.total).to.equal(5000);
    expect(order.trackingCode).to.match(/^DOPS-/);
    expect(order.statusHistory).to.have.length(1);
  });

  it('debería guardar el depósito de origen', async () => {
    const { user, token } = await createUser('admin');

    const customer = await User.create({
      firstName: 'Cliente',
      lastName: 'Prueba',
      email: 'cliente-deposito@test.com',
      password: 'hash-test',
      role: 'customer'
    });

    const depot = await Depot.create({
      name: 'Depósito Rosario',
      code: 'ROS-LOG',
      address: {
        street: 'San Martín',
        number: '100',
        city: 'Rosario',
        province: 'Santa Fe'
      },
      active: true
    });

    const response = await request(app)
      .post('/api/orders')
      .set(authorization(token))
      .send({
        customer: customer.id,
        items: [
          {
            name: 'Paquete',
            quantity: 1,
            price: 1200
          }
        ],
        deliveryAddress: 'Urquiza 1000, Rosario',
        originDepot: depot.id,
        priority: 'high'
      });

    expect(response.status).to.equal(201);

    const saved = await Order.findById(response.body.order._id);

    expect(saved.originDepot.toString()).to.equal(depot.id);
    expect(saved.priority).to.equal('high');
    expect(user.role).to.equal('admin');
  });

  it('debería permitir al dueño consultar la logística', async () => {
    const { user, token } = await createUser('customer');
    const order = await createOrder(user.id);

    const response = await request(app)
      .get(`/api/orders/${order.id}/logistics`)
      .set(authorization(token));

    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('created');
    expect(response.body.deliveryAddress).to.equal(
      'San Martín 1200, Rosario'
    );
  });

  it('debería impedir consultar pedidos ajenos', async () => {
    const { token } = await createUser('customer');
    const other = await createUser('customer');
    const order = await createOrder(other.user.id);

    const response = await request(app)
      .get(`/api/orders/${order.id}/logistics`)
      .set(authorization(token));

    expect(response.status).to.equal(403);
  });

  it('debería permitir al admin actualizar datos logísticos', async () => {
    const { token } = await createUser('admin');
    const customer = await createUser('customer');
    const order = await createOrder(customer.user.id);

    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(authorization(token))
      .send({
        deliveryAddress: 'Mitre 2200, Rosario',
        recipient: {
          fullName: 'Pedro Gómez',
          phone: '3415551212'
        },
        shippingCost: {
          currency: 'ARS',
          baseCost: 800,
          distanceCost: 200
        }
      });

    expect(response.status).to.equal(200);

    const saved = await Order.findById(order.id);

    expect(saved.recipient.fullName).to.equal('Pedro Gómez');
    expect(saved.deliveryAddress).to.equal('Mitre 2200, Rosario');
    expect(saved.shippingCost.total).to.equal(1000);
  });

  it('debería impedir que el customer modifique la logística', async () => {
    const { user, token } = await createUser('customer');
    const order = await createOrder(user.id);

    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(authorization(token))
      .send({
        deliveryInstructions: 'Modificar sin autorización'
      });

    expect(response.status).to.equal(403);
  });

  it('debería impedir modificar pedidos asignados', async () => {
    const { token } = await createUser('admin');
    const customer = await createUser('customer');

    const order = await createOrder(customer.user.id, {
      status: 'assigned'
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/logistics`)
      .set(authorization(token))
      .send({
        deliveryInstructions: 'Cambio posterior'
      });

    expect(response.status).to.equal(400);
  });
});
