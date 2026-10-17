
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createUser(role) {
  const password = 'PasswordSeguro123!';

  const user = await User.create({
    firstName: 'Usuario',
    lastName: 'DeliveryOps',
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

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createDeliveryFixture(status = 'in_transit') {
  const admin = await createUser('admin');
  const customer = await createUser('customer');
  const driver = await createUser('driver');

  const order = await Order.create({
    customer: customer.user.id,
    items: [
      {
        name: 'Producto test',
        quantity: 1,
        price: 1000
      }
    ],
    deliveryAddress: 'Córdoba 1500, Rosario',
    total: 1000,
    status: status === 'in_transit' ? 'in_transit' : 'assigned'
  });

  const delivery = await Delivery.create({
    order: order.id,
    driver: driver.user.id,
    status,
    assignedAt: new Date()
  });

  order.delivery = delivery.id;
  await order.save();

  return { admin, customer, driver, order, delivery };
}

describe('Delivery Logistics API', () => {
  it('debería mostrar el detalle al repartidor asignado', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/logistics`)
      .set(auth(driver.token));

    expect(response.status).to.equal(200);
    expect(response.body.delivery._id).to.equal(delivery.id);
    expect(response.body.order).to.exist;
  });

  it('debería registrar ubicación GPS del repartidor', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(driver.token))
      .send({
        latitude: -32.9468,
        longitude: -60.6393,
        accuracyMeters: 10,
        speedKph: 25,
        source: 'gps'
      });

    expect(response.status).to.equal(201);

    const saved = await Delivery.findById(delivery.id);

    expect(saved.locationHistory).to.have.length(1);
    expect(saved.currentLocation.latitude).to.equal(-32.9468);
    expect(saved.locationHistory[0].speedKph).to.equal(25);
  });

  it('debería permitir al cliente consultar ubicaciones', async () => {
    const { customer, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .get(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(customer.token));

    expect(response.status).to.equal(200);
    expect(response.body.locationHistory).to.be.an('array');
  });

  it('debería impedir registrar ubicación a otro repartidor', async () => {
    const { delivery } = await createDeliveryFixture();
    const outsider = await createUser('driver');

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(outsider.token))
      .send({
        latitude: -32.95,
        longitude: -60.64
      });

    expect(response.status).to.equal(403);
  });

  it('debería rechazar coordenadas inválidas', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(driver.token))
      .send({
        latitude: 120,
        longitude: -60.64
      });

    expect(response.status).to.equal(400);
  });

  it('debería registrar comprobante de entrega', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/proof`)
      .set(auth(driver.token))
      .send({
        receivedBy: 'María Fernández',
        relationship: 'Destinataria',
        signatureUrl: 'https://example.com/firma.png',
        photoUrls: ['https://example.com/entrega.jpg'],
        notes: 'Entrega recibida conforme'
      });

    expect(response.status).to.equal(201);

    const saved = await Delivery.findById(delivery.id);

    expect(saved.proofOfDelivery.receivedBy).to.equal(
      'María Fernández'
    );
    expect(saved.proofOfDelivery.receivedAt).to.exist;
    expect(saved.status).to.equal('in_transit');
  });

  it('debería impedir duplicar el comprobante', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    await request(app)
      .post(`/api/deliveries/${delivery.id}/proof`)
      .set(auth(driver.token))
      .send({ receivedBy: 'María Fernández' })
      .expect(201);

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/proof`)
      .set(auth(driver.token))
      .send({ receivedBy: 'Otra persona' });

    expect(response.status).to.equal(400);
  });

  it('debería registrar intento de entrega fallido', async () => {
    const { driver, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/attempts`)
      .set(auth(driver.token))
      .send({
        outcome: 'recipient_absent',
        notes: 'No había nadie en el domicilio',
        latitude: -32.9468,
        longitude: -60.6393
      });

    expect(response.status).to.equal(201);

    const saved = await Delivery.findById(delivery.id);

    expect(saved.deliveryAttempts).to.have.length(1);
    expect(saved.deliveryAttempts[0].outcome).to.equal(
      'recipient_absent'
    );
    expect(saved.status).to.equal('in_transit');
  });

  it('debería impedir registrar GPS en una entrega finalizada', async () => {
    const { driver, delivery } = await createDeliveryFixture('delivered');

    const response = await request(app)
      .post(`/api/deliveries/${delivery.id}/locations`)
      .set(auth(driver.token))
      .send({
        latitude: -32.95,
        longitude: -60.64
      });

    expect(response.status).to.equal(400);
  });

  it('debería permitir al admin actualizar costos operativos', async () => {
    const { admin, delivery } = await createDeliveryFixture();

    const response = await request(app)
      .patch(`/api/deliveries/${delivery.id}/logistics`)
      .set(auth(admin.token))
      .send({
        costs: {
          currency: 'ARS',
          plannedCost: 2000,
          fuelCost: 500,
          tollCost: 200,
          totalActualCost: 700
        },
        driverNotes: 'Revisar acceso al edificio'
      });

    expect(response.status).to.equal(200);

    const saved = await Delivery.findById(delivery.id);

    expect(saved.costs.totalActualCost).to.equal(700);
    expect(saved.driverNotes).to.equal(
      'Revisar acceso al edificio'
    );
  });
});
