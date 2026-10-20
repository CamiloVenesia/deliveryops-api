
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

function auth(token) {
    return {
        Authorization: `Bearer ${token}`
    };
}

async function createOrder(customerId) {
    return Order.create({
        customer: customerId,
        items: [
            {
                name: 'Paquete de prueba',
                quantity: 1,
                price: 1500
            }
        ],
        deliveryAddress: 'Rosario, Santa Fe',
        total: 1500,
        status: 'created'
    });
}

async function assignDelivery(admin, customerId, driverId) {
    const order = await createOrder(customerId);

    const response = await request(app)
        .post('/api/deliveries')
        .set(auth(admin.token))
        .send({
            order: order.id,
            driver: driverId
        });

    return { order, response };
}

describe('Gestión de repartidores API', () => {
    it('protege el listado administrativo', async () => {
        const anonymous = await request(app)
            .get('/api/drivers');

        expect(anonymous.status).to.equal(401);

        const customer = await createActor('customer');

        const forbidden = await request(app)
            .get('/api/drivers')
            .set(auth(customer.token));

        expect(forbidden.status).to.equal(403);
    });

    it('inicia con capacidad predeterminada de 12 entregas', async () => {
        const admin = await createActor('admin');
        const driver = await createActor('driver');

        const response = await request(app)
            .get('/api/drivers')
            .set(auth(admin.token));

        expect(response.status).to.equal(200);
        expect(response.body.total).to.equal(1);

        const item = response.body.items[0];

        expect(item.id).to.equal(driver.user.id);
        expect(item.effectiveStatus).to.equal('available');
        expect(item.configured).to.equal(false);
        expect(item.maxConcurrentDeliveries).to.equal(12);
        expect(item.remainingCapacity).to.equal(12);
        expect(item.metrics.activeDeliveries).to.equal(0);
    });

    it('permite consultar el propio perfil e impide consultar otro', async () => {
        const driver = await createActor('driver');
        const other = await createActor('driver');

        const ownProfile = await request(app)
            .get('/api/drivers/me')
            .set(auth(driver.token));

        expect(ownProfile.status).to.equal(200);
        expect(ownProfile.body.driver.id)
            .to.equal(driver.user.id);

        const forbidden = await request(app)
            .get(`/api/drivers/${other.user.id}`)
            .set(auth(driver.token));

        expect(forbidden.status).to.equal(403);
    });

    it('impide asignaciones a repartidores fuera de servicio u ocupados manualmente', async () => {
        const admin = await createActor('admin');
        const customer = await createActor('customer');
        const driver = await createActor('driver');
        const order = await createOrder(customer.user.id);

        for (const status of ['offline', 'busy']) {
            const update = await request(app)
                .patch(`/api/drivers/${driver.user.id}/availability`)
                .set(auth(admin.token))
                .send({ status });

            expect(update.status).to.equal(200);

            const response = await request(app)
                .post('/api/deliveries')
                .set(auth(admin.token))
                .send({
                    order: order.id,
                    driver: driver.user.id
                });

            expect(response.status).to.equal(400);

            expect(
                await Delivery.countDocuments({
                    order: order.id
                })
            ).to.equal(0);
        }

        const storedOrder = await Order.findById(order.id);

        expect(storedOrder.status).to.equal('created');
        expect(storedOrder.delivery).to.be.null;
    });

    it('permite múltiples asignaciones hasta alcanzar la capacidad', async () => {
        const admin = await createActor('admin');
        const customer = await createActor('customer');
        const driver = await createActor('driver');

        const capacity = await request(app)
            .patch(`/api/drivers/${driver.user.id}/capacity`)
            .set(auth(admin.token))
            .send({
                maxConcurrentDeliveries: 2
            });

        expect(capacity.status).to.equal(200);
        expect(capacity.body.maxConcurrentDeliveries).to.equal(2);
        expect(capacity.body.remainingCapacity).to.equal(2);

        const first = await assignDelivery(
            admin,
            customer.user.id,
            driver.user.id
        );

        expect(first.response.status).to.equal(201);

        const afterFirst = await request(app)
            .get('/api/drivers/me')
            .set(auth(driver.token));

        expect(afterFirst.status).to.equal(200);
        expect(afterFirst.body.driver.effectiveStatus)
            .to.equal('available');
        expect(afterFirst.body.driver.metrics.activeDeliveries)
            .to.equal(1);
        expect(afterFirst.body.driver.remainingCapacity)
            .to.equal(1);

        const second = await assignDelivery(
            admin,
            customer.user.id,
            driver.user.id
        );

        expect(second.response.status).to.equal(201);

        const full = await request(app)
            .get('/api/drivers/me')
            .set(auth(driver.token));

        expect(full.body.driver.effectiveStatus).to.equal('busy');
        expect(full.body.driver.remainingCapacity).to.equal(0);
        expect(full.body.driver.utilizationPercent).to.equal(100);

        const third = await assignDelivery(
            admin,
            customer.user.id,
            driver.user.id
        );

        expect(third.response.status).to.equal(400);

        const unchanged = await Order.findById(third.order.id);

        expect(unchanged.status).to.equal('created');
        expect(unchanged.delivery).to.be.null;

        expect(
            await Delivery.countDocuments({
                driver: driver.user.id,
                status: 'assigned'
            })
        ).to.equal(2);
    });

    it('permite cambiar la capacidad sin cancelar entregas existentes', async () => {
        const admin = await createActor('admin');
        const customer = await createActor('customer');
        const driver = await createActor('driver');

        const first = await assignDelivery(
            admin,
            customer.user.id,
            driver.user.id
        );

        const second = await assignDelivery(
            admin,
            customer.user.id,
            driver.user.id
        );

        expect(first.response.status).to.equal(201);
        expect(second.response.status).to.equal(201);

        const reduced = await request(app)
            .patch(`/api/drivers/${driver.user.id}/capacity`)
            .set(auth(admin.token))
            .send({ maxConcurrentDeliveries: 1 });

        expect(reduced.status).to.equal(200);
        expect(reduced.body.maxConcurrentDeliveries).to.equal(1);
        expect(reduced.body.remainingCapacity).to.equal(0);
        expect(reduced.body.effectiveStatus).to.equal('busy');

        const available = await request(app)
            .patch(`/api/drivers/${driver.user.id}/availability`)
            .set(auth(driver.token))
            .send({ status: 'available' });

        expect(available.status).to.equal(200);
        expect(available.body.declaredStatus).to.equal('available');
        expect(available.body.effectiveStatus).to.equal('busy');

        expect(
            await Delivery.countDocuments({
                driver: driver.user.id,
                status: 'assigned'
            })
        ).to.equal(2);

        const expanded = await request(app)
            .patch(`/api/drivers/${driver.user.id}/capacity`)
            .set(auth(admin.token))
            .send({ maxConcurrentDeliveries: 4 });

        expect(expanded.status).to.equal(200);
        expect(expanded.body.remainingCapacity).to.equal(2);
        expect(expanded.body.effectiveStatus).to.equal('available');
    });

    it('impide que repartidores modifiquen capacidades y rechaza valores inválidos', async () => {
        const admin = await createActor('admin');
        const driver = await createActor('driver');

        const forbidden = await request(app)
            .patch(`/api/drivers/${driver.user.id}/capacity`)
            .set(auth(driver.token))
            .send({ maxConcurrentDeliveries: 20 });

        expect(forbidden.status).to.equal(403);

        for (const capacity of [0, 51, 1.5, 'muchas']) {
            const response = await request(app)
                .patch(`/api/drivers/${driver.user.id}/capacity`)
                .set(auth(admin.token))
                .send({
                    maxConcurrentDeliveries: capacity
                });

            expect(response.status).to.equal(400);
        }
    });

    it('filtra correctamente las estadísticas individuales por período', async () => {
        const admin = await createActor('admin');
        const customer = await createActor('customer');
        const driver = await createActor('driver');

        const now = Date.now();
        const order = await createOrder(customer.user.id);

        await Delivery.create({
            order: order.id,
            driver: driver.user.id,
            status: 'delivered',
            trackingCode: `DOPD-TEST-${randomUUID().slice(0, 8)}`,
            assignedAt: new Date(now - 20 * 24 * 60 * 60000 - 60 * 60000),
            deliveredAt: new Date(now - 20 * 24 * 60 * 60000)
        });

        const last7 = await request(app)
            .get(`/api/drivers/${driver.user.id}?days=7`)
            .set(auth(admin.token));

        const last30 = await request(app)
            .get(`/api/drivers/${driver.user.id}?days=30`)
            .set(auth(admin.token));

        expect(last7.status).to.equal(200);
        expect(last30.status).to.equal(200);
        expect(last7.body.periodDays).to.equal(7);
        expect(last30.body.periodDays).to.equal(30);
        expect(last7.body.driver.metrics.completedInPeriod).to.equal(0);
        expect(last30.body.driver.metrics.completedInPeriod).to.equal(1);
    });

    it('muestra historial y tiempo promedio de entregas completadas', async () => {
        const admin = await createActor('admin');
        const customer = await createActor('customer');
        const driver = await createActor('driver');

        const order = await createOrder(customer.user.id);
        const now = Date.now();

        await Delivery.create({
            order: order.id,
            driver: driver.user.id,
            status: 'delivered',
            trackingCode: `DOPD-TEST-${randomUUID().slice(0, 8)}`,
            assignedAt: new Date(now - 120 * 60000),
            deliveredAt: new Date(now - 60 * 60000)
        });

        const response = await request(app)
            .get(`/api/drivers/${driver.user.id}?days=30`)
            .set(auth(admin.token));

        expect(response.status).to.equal(200);
        expect(response.body.driver.metrics.completedInPeriod).to.equal(1);
        expect(response.body.driver.metrics.averageDeliveryMinutes).to.equal(60);
        expect(response.body.totalDeliveries).to.equal(1);
        expect(response.body.recentDeliveries).to.have.length(1);
    });
});
