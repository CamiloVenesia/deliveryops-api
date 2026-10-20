
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createUser(role) {
    const password = 'DeliveryOpsTest123';

    const user = await User.create({
        firstName: 'Prueba',
        lastName: role,
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

async function createOrder(customer, data = {}) {
    return Order.create({
        customer: customer._id,
        trackingCode: data.trackingCode,
        items: [
            {
                name: 'Paquete de prueba',
                quantity: 1,
                price: 100
            }
        ],
        deliveryAddress: data.deliveryAddress || 'Rosario, Santa Fe',
        recipient: {
            fullName: data.recipient || 'Destinatario demo'
        },
        total: 100,
        status: data.status || 'created',
        priority: data.priority || 'normal'
    });
}

async function createDelivery(order, driver, data = {}) {
    const delivery = await Delivery.create({
        order: order._id,
        driver: driver._id,
        trackingCode: data.trackingCode,
        status: data.status || 'assigned',
        priority: data.priority || 'normal'
    });

    order.delivery = delivery._id;
    await order.save();

    return delivery;
}

describe('Búsqueda operativa avanzada', () => {
    it('busca en todos los pedidos antes de paginar', async () => {
        const admin = await createUser('admin');
        const customer = await createUser('customer');

        for (let i = 1; i <= 12; i++) {
            await createOrder(customer.user, {
                trackingCode: `BUSQ-ALFA-${String(i).padStart(4, '0')}`,
                status: i % 2 === 0 ? 'created' : 'assigned'
            });
        }

        const response = await request(app)
            .get('/api/orders')
            .query({
                q: 'BUSQ-ALFA',
                status: 'created',
                page: 2,
                limit: 3,
                sort: 'newest'
            })
            .set('Authorization', `Bearer ${admin.token}`);

        expect(response.status).to.equal(200);
        expect(response.body.total).to.equal(6);
        expect(response.body.totalPages).to.equal(2);
        expect(response.body.items).to.have.length(3);
        expect(
            response.body.items.every(item => item.status === 'created')
        ).to.equal(true);
    });

    it('impide buscar pedidos de otros clientes', async () => {
        const customer = await createUser('customer');
        const other = await createUser('customer');

        await createOrder(customer.user, {
            trackingCode: 'BUSQ-PRIVADO-0001'
        });

        await createOrder(other.user, {
            trackingCode: 'BUSQ-PRIVADO-0002'
        });

        const response = await request(app)
            .get('/api/orders')
            .query({
                q: 'BUSQ-PRIVADO',
                sort: 'newest'
            })
            .set('Authorization', `Bearer ${customer.token}`);

        expect(response.status).to.equal(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.items[0].trackingCode)
            .to.equal('BUSQ-PRIVADO-0001');
    });

    it('respeta el repartidor asignado al buscar entregas', async () => {
        const customer = await createUser('customer');
        const driver1 = await createUser('driver');
        const driver2 = await createUser('driver');

        const order1 = await createOrder(customer.user, {
            trackingCode: 'BUSQ-ORDEN-0001'
        });

        const order2 = await createOrder(customer.user, {
            trackingCode: 'BUSQ-ORDEN-0002'
        });

        await createDelivery(order1, driver1.user, {
            trackingCode: 'BUSQ-ENTREGA-0001'
        });

        await createDelivery(order2, driver2.user, {
            trackingCode: 'BUSQ-ENTREGA-0002'
        });

        const response = await request(app)
            .get('/api/deliveries')
            .query({
                q: 'BUSQ-ENTREGA',
                status: 'assigned',
                sort: 'newest'
            })
            .set('Authorization', `Bearer ${driver1.token}`);

        expect(response.status).to.equal(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.items[0].trackingCode)
            .to.equal('BUSQ-ENTREGA-0001');
    });

    it('busca entregas por el código del pedido relacionado', async () => {
        const admin = await createUser('admin');
        const customer = await createUser('customer');
        const driver = await createUser('driver');

        const order = await createOrder(customer.user, {
            trackingCode: 'BUSQ-PEDIDO-EXACTO'
        });

        await createDelivery(order, driver.user, {
            trackingCode: 'BUSQ-ENVIO-EXACTO'
        });

        const response = await request(app)
            .get('/api/deliveries')
            .query({
                q: 'BUSQ-PEDIDO-EXACTO',
                sort: 'newest'
            })
            .set('Authorization', `Bearer ${admin.token}`);

        expect(response.status).to.equal(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.items[0].trackingCode)
            .to.equal('BUSQ-ENVIO-EXACTO');
    });

    it('rechaza fechas y estados inválidos', async () => {
        const admin = await createUser('admin');

        const invalidDate = await request(app)
            .get('/api/orders')
            .query({ from: '2026-02-31' })
            .set('Authorization', `Bearer ${admin.token}`);

        const invalidStatus = await request(app)
            .get('/api/deliveries')
            .query({ status: 'inexistente' })
            .set('Authorization', `Bearer ${admin.token}`);

        expect(invalidDate.status).to.equal(400);
        expect(invalidStatus.status).to.equal(400);
    });
});
