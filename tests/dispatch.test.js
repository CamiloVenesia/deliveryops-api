
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import AssignmentLease from '../src/models/assignment-lease.model.js';

async function actor(role) {
    const password = 'PasswordSeguro123!';

    const user = await User.create({
        firstName: 'Prueba',
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

// Inicializa el subdocumento driverProfile antes de modificar
// campos internos. Los usuarios de prueba pueden tenerlo en null.
async function configureDriver(driverId, changes = {}) {
    const driver = await User.findById(driverId);

    if (!driver) {
        throw new Error('No se encontró el repartidor de prueba');
    }

    driver.driverProfile = {
        ...(driver.driverProfile?.toObject?.() ?? {}),
        availabilityStatus: 'available',
        maxConcurrentDeliveries: 12,
        ...changes
    };

    await driver.save();

    return driver;
}

async function orderFor(customer) {
    return Order.create({
        customer: customer.id,
        items: [
            {
                name: 'Caja demo',
                quantity: 1,
                price: 100
            }
        ],
        deliveryAddress: 'Rosario, Santa Fe',
        total: 100,
        status: 'created'
    });
}

function assignment(token, order, driver) {
    return request(app)
        .post('/api/deliveries')
        .set(
            'Authorization',
            `Bearer ${token}`
        )
        .send({
            order: order.id,
            driver: driver.id
        });
}

describe('Bloque 11 - Despacho inteligente', () => {
    afterEach(async () => {
        await AssignmentLease.deleteMany({});
    });

    it('protege las recomendaciones y prioriza los cupos libres', async () => {
        const admin = await actor('admin');
        const customer = await actor('customer');
        const free = await actor('driver');
        const occupied = await actor('driver');

        await configureDriver(free.user.id, {
            availabilityStatus: 'available'
        });

        await configureDriver(occupied.user.id, {
            availabilityStatus: 'busy'
        });

        const forbidden = await request(app)
            .get('/api/drivers/recommendations')
            .set(
                'Authorization',
                `Bearer ${customer.token}`
            );

        expect(forbidden.status).to.equal(403);

        const result = await request(app)
            .get('/api/drivers/recommendations')
            .set(
                'Authorization',
                `Bearer ${admin.token}`
            );

        expect(result.status).to.equal(200);
        expect(result.body.items).to.have.length(2);

        expect(result.body.items[0].id)
            .to.equal(free.user.id);

        expect(result.body.items[0].eligibleForAssignment)
            .to.equal(true);

        expect(result.body.items[0].remainingCapacity)
            .to.equal(12);

        expect(result.body.items[1].id)
            .to.equal(occupied.user.id);

        expect(result.body.items[1].eligibleForAssignment)
            .to.equal(false);

        expect(result.body.items[1].declaredStatus)
            .to.equal('busy');
    });

    it('no supera la capacidad con dos asignaciones simultáneas', async () => {
        const admin = await actor('admin');
        const customer = await actor('customer');
        const driver = await actor('driver');

        await configureDriver(driver.user.id, {
            availabilityStatus: 'available',
            maxConcurrentDeliveries: 1
        });

        const first = await orderFor(customer.user);
        const second = await orderFor(customer.user);

        const responses = await Promise.all([
            assignment(
                admin.token,
                first,
                driver.user
            ),
            assignment(
                admin.token,
                second,
                driver.user
            )
        ]);

        const successful = responses.filter(
            item => item.status === 201
        );

        const rejected = responses.filter(
            item => [400, 409].includes(item.status)
        );

        expect(successful).to.have.length(1);
        expect(rejected).to.have.length(1);

        expect(
            await Delivery.countDocuments({
                driver: driver.user.id
            })
        ).to.equal(1);

        const storedFirst = await Order.findById(first.id);
        const storedSecond = await Order.findById(second.id);

        const assignedOrders = [
            storedFirst,
            storedSecond
        ].filter(order => order.status === 'assigned');

        expect(assignedOrders).to.have.length(1);
    });

    it('no crea dos entregas para el mismo pedido', async () => {
        const admin = await actor('admin');
        const customer = await actor('customer');
        const driverA = await actor('driver');
        const driverB = await actor('driver');

        await configureDriver(driverA.user.id);
        await configureDriver(driverB.user.id);

        const order = await orderFor(customer.user);

        const responses = await Promise.all([
            assignment(
                admin.token,
                order,
                driverA.user
            ),
            assignment(
                admin.token,
                order,
                driverB.user
            )
        ]);

        const successful = responses.filter(
            item => item.status === 201
        );

        const rejected = responses.filter(
            item => [400, 409].includes(item.status)
        );

        expect(successful).to.have.length(1);
        expect(rejected).to.have.length(1);

        expect(
            await Delivery.countDocuments({
                order: order.id
            })
        ).to.equal(1);
    });
});
