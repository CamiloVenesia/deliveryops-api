
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Depot from '../src/models/depot.model.js';

const depotData = {
  name: 'Centro Logístico Rosario',
  code: 'ROS-CENTRO',
  address: {
    street: 'San Martín',
    number: '1250',
    neighborhood: 'Centro',
    city: 'Rosario',
    province: 'Santa Fe',
    postalCode: '2000',
    country: 'Argentina',
    latitude: -32.9468,
    longitude: -60.6393
  },
  contact: {
    name: 'Operaciones',
    email: 'operaciones@deliveryops.com',
    phone: '3415551234'
  },
  operatingHours: [
    {
      day: 1,
      enabled: true,
      open: '08:00',
      close: '18:00'
    }
  ],
  serviceAreas: ['Rosario', 'Funes'],
  maxDailyDeliveries: 100,
  notes: 'Depósito principal',
  active: true
};

async function loginAs(role) {
  const password = 'PasswordSeguro123';

  const user = await User.create({
    firstName: 'Usuario',
    lastName: 'Prueba',
    email: `${role}@depots-test.com`,
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
  expect(response.body.accessToken).to.be.a('string');

  return response.body.accessToken;
}

function auth(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

describe('Depots API', () => {
  beforeEach(async () => {
    await Depot.deleteMany({});
  });

  after(async () => {
    await Depot.deleteMany({});
  });

  describe('POST /api/depots', () => {
    it('debería permitir crear un depósito como admin', async () => {
      const token = await loginAs('admin');

      const response = await request(app)
        .post('/api/depots')
        .set(auth(token))
        .send(depotData);

      expect(response.status).to.equal(201);
      expect(response.body.name).to.equal(depotData.name);
      expect(response.body.code).to.equal('ROS-CENTRO');
      expect(response.body.active).to.equal(true);

      const saved = await Depot.findById(response.body._id);

      expect(saved).to.exist;
      expect(saved.address.city).to.equal('Rosario');
    });

    it('debería impedir crear depósitos como customer', async () => {
      const token = await loginAs('customer');

      const response = await request(app)
        .post('/api/depots')
        .set(auth(token))
        .send(depotData);

      expect(response.status).to.equal(403);
      expect(await Depot.countDocuments()).to.equal(0);
    });

    it('debería rechazar datos inválidos', async () => {
      const token = await loginAs('admin');

      const response = await request(app)
        .post('/api/depots')
        .set(auth(token))
        .send({
          name: 'A',
          code: '',
          address: {}
        });

      expect(response.status).to.equal(400);
      expect(await Depot.countDocuments()).to.equal(0);
    });

    it('debería impedir códigos duplicados', async () => {
      const token = await loginAs('admin');

      await Depot.create(depotData);

      const response = await request(app)
        .post('/api/depots')
        .set(auth(token))
        .send({
          ...depotData,
          name: 'Otro depósito'
        });

      expect(response.status).to.equal(400);
      expect(await Depot.countDocuments()).to.equal(1);
    });
  });

  describe('GET /api/depots', () => {
    it('debería listar depósitos como admin', async () => {
      const token = await loginAs('admin');

      await Depot.create(depotData);

      const response = await request(app)
        .get('/api/depots')
        .set(auth(token));

      expect(response.status).to.equal(200);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.length(1);
      expect(response.body.total).to.equal(1);
    });

    it('debería permitir listar como store', async () => {
      const token = await loginAs('store');

      const response = await request(app)
        .get('/api/depots')
        .set(auth(token));

      expect(response.status).to.equal(200);
    });

    it('debería responder 401 sin autenticación', async () => {
      const response = await request(app)
        .get('/api/depots');

      expect(response.status).to.equal(401);
    });

    it('debería impedir listar como customer', async () => {
      const token = await loginAs('customer');

      const response = await request(app)
        .get('/api/depots')
        .set(auth(token));

      expect(response.status).to.equal(403);
    });
  });

  describe('GET /api/depots/:did', () => {
    it('debería devolver un depósito existente', async () => {
      const token = await loginAs('admin');
      const depot = await Depot.create(depotData);

      const response = await request(app)
        .get(`/api/depots/${depot.id}`)
        .set(auth(token));

      expect(response.status).to.equal(200);
      expect(response.body.code).to.equal('ROS-CENTRO');
    });

    it('debería rechazar identificadores inválidos', async () => {
      const token = await loginAs('admin');

      const response = await request(app)
        .get('/api/depots/invalid-id')
        .set(auth(token));

      expect(response.status).to.equal(400);
    });
  });

  describe('PATCH /api/depots/:did', () => {
    it('debería actualizar un depósito', async () => {
      const token = await loginAs('admin');
      const depot = await Depot.create(depotData);

      const response = await request(app)
        .patch(`/api/depots/${depot.id}`)
        .set(auth(token))
        .send({
          name: 'Centro Logístico Actualizado',
          maxDailyDeliveries: 200
        });

      expect(response.status).to.equal(200);
      expect(response.body.name).to.equal(
        'Centro Logístico Actualizado'
      );
      expect(response.body.maxDailyDeliveries).to.equal(200);
    });

    it('debería impedir modificaciones como store', async () => {
      const token = await loginAs('store');
      const depot = await Depot.create(depotData);

      const response = await request(app)
        .patch(`/api/depots/${depot.id}`)
        .set(auth(token))
        .send({
          name: 'Modificación no autorizada'
        });

      expect(response.status).to.equal(403);
    });
  });

  describe('DELETE /api/depots/:did', () => {
    it('debería eliminar un depósito sin operaciones', async () => {
      const token = await loginAs('admin');
      const depot = await Depot.create(depotData);

      const response = await request(app)
        .delete(`/api/depots/${depot.id}`)
        .set(auth(token));

      expect(response.status).to.equal(200);
      expect(response.body.deleted).to.equal(true);

      const saved = await Depot.findById(depot.id);
      expect(saved).to.be.null;
    });

    it('debería impedir eliminar como customer', async () => {
      const token = await loginAs('customer');
      const depot = await Depot.create(depotData);

      const response = await request(app)
        .delete(`/api/depots/${depot.id}`)
        .set(auth(token));

      expect(response.status).to.equal(403);

      const saved = await Depot.findById(depot.id);
      expect(saved).to.exist;
    });
  });
});
