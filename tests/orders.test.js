// tests/orders.test.js

import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';

async function createAdminAndLogin() {
    const password =
        'AdminPassword123';

    const hashedPassword =
        await bcrypt.hash(
            password,
            10
        );

    const user =
        await User.create({
            firstName:
                'Admin',
            lastName:
                'DeliveryOps',
            email:
                `admin-${Date.now()}@deliveryops.com`,
            password:
                hashedPassword,
            role:
                'admin'
        });

    const response =
        await request(app)
            .post(
                '/api/auth/login'
            )
            .send({
                email:
                    user.email,
                password
            });

    return {
        user,
        accessToken:
            response.body
                .accessToken
    };
}

async function createCustomerAndLogin() {
    const email =
        `customer-${Date.now()}-${Math.random()}@deliveryops.com`;

    const password =
        'CustomerPassword123';

    const createResponse =
        await request(app)
            .post('/api/users')
            .send({
                firstName:
                    'Cliente',
                lastName:
                    'Test',
                email,
                password,
                role:
                    'customer'
            });

    const loginResponse =
        await request(app)
            .post(
                '/api/auth/login'
            )
            .send({
                email,
                password
            });

    return {
        user:
            createResponse.body,
        accessToken:
            loginResponse.body
                .accessToken
    };
}

async function createTestCustomer() {
    return await User.create({
        firstName:
            'Cliente',
        lastName:
            'Test',
        email:
            `cliente-${Date.now()}-${Math.random()}@mail.com`,
        password:
            'hash-interno-test',
        role:
            'customer'
    });
}

describe('Orders API', () => {

    describe('GET /api/orders', () => {

        it('debería devolver una lista vacía para un admin si no hay pedidos', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .get(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.items
            ).to.be.an('array');

            expect(
                response.body.items
            ).to.have.length(0);

            expect(
                response.body.page
            ).to.equal(1);

            expect(
                response.body.total
            ).to.equal(0);
        });

        it('debería permitir que un customer vea solamente sus pedidos', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const otherCustomer =
                await createTestCustomer();

            await Order.create({
                customer:
                    user._id,
                items: [
                    {
                        name:
                            'Pedido propio',
                        quantity: 1,
                        price: 100
                    }
                ],
                deliveryAddress:
                    'Calle 1',
                total: 100
            });

            await Order.create({
                customer:
                    otherCustomer._id,
                items: [
                    {
                        name:
                            'Pedido ajeno',
                        quantity: 1,
                        price: 200
                    }
                ],
                deliveryAddress:
                    'Calle 2',
                total: 200
            });

            const response =
                await request(app)
                    .get(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.items
            ).to.have.length(1);

            expect(
                response.body.items[0]
                    .customer
            ).to.equal(
                user._id
            );
        });

        it('debería responder 401 sin autenticación', async () => {
            const response =
                await request(app)
                    .get(
                        '/api/orders'
                    );

            expect(
                response.status
            ).to.equal(401);

            expect(
                response.body.error
            ).to.equal(
                'UNAUTHORIZED'
            );
        });
    });

    describe('POST /api/orders', () => {

        it('debería permitir que un customer cree su propio pedido', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const response =
                await request(app)
                    .post(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        items: [
                            {
                                name:
                                    'Bicicleta',
                                quantity: 2,
                                price: 1500
                            }
                        ],
                        deliveryAddress:
                            'Calle Falsa 123'
                    });

            expect(
                response.status
            ).to.equal(201);

            expect(
                response.body.order.total
            ).to.equal(3000);

            expect(
                response.body.order.status
            ).to.equal(
                'created'
            );

            expect(
                response.body.order.customer
            ).to.equal(
                user._id
            );
        });

        it('debería impedir que un customer cree un pedido para otro usuario', async () => {
            const {
                accessToken
            } =
                await createCustomerAndLogin();

            const otherCustomer =
                await createTestCustomer();

            const response =
                await request(app)
                    .post(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        customer:
                            otherCustomer._id.toString(),
                        items: [
                            {
                                name:
                                    'Test',
                                quantity: 1,
                                price: 100
                            }
                        ],
                        deliveryAddress:
                            'Calle Falsa 123'
                    });

            expect(
                response.status
            ).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });

        it('debería responder 400 si un admin no indica el cliente', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .post(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        items: [
                            {
                                name:
                                    'Test',
                                quantity: 1,
                                price: 100
                            }
                        ],
                        deliveryAddress:
                            'Calle Falsa 123'
                    });

            expect(
                response.status
            ).to.equal(400);

            expect(
                response.body.error
            ).to.equal(
                'VALIDATION_ERROR'
            );
        });

        it('debería responder 404 si el cliente no existe', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .post(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        customer:
                            '64b000000000000000000000',
                        items: [
                            {
                                name:
                                    'Test',
                                quantity: 1,
                                price: 100
                            }
                        ],
                        deliveryAddress:
                            'Calle Falsa 123'
                    });

            expect(
                response.status
            ).to.equal(404);

            expect(
                response.body.error
            ).to.equal(
                'USER_NOT_FOUND'
            );
        });

        it('debería responder 403 si el cliente tiene rol driver', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const driver =
                await User.create({
                    firstName:
                        'Repartidor',
                    lastName:
                        'Test',
                    email:
                        `driver-${Date.now()}@mail.com`,
                    password:
                        'hash-interno-test',
                    role:
                        'driver'
                });

            const response =
                await request(app)
                    .post(
                        '/api/orders'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        customer:
                            driver._id.toString(),
                        items: [
                            {
                                name:
                                    'Test',
                                quantity: 1,
                                price: 100
                            }
                        ],
                        deliveryAddress:
                            'Calle Falsa 123'
                    });

            expect(
                response.status
            ).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });
    });

    describe('GET /api/orders/:oid', () => {

        it('debería permitir que un customer vea su propio pedido', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const order =
                await Order.create({
                    customer:
                        user._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .get(
                        `/api/orders/${order._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body._id
            ).to.equal(
                order._id.toString()
            );
        });

        it('debería impedir que un customer vea un pedido ajeno', async () => {
            const {
                accessToken
            } =
                await createCustomerAndLogin();

            const otherCustomer =
                await createTestCustomer();

            const order =
                await Order.create({
                    customer:
                        otherCustomer._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .get(
                        `/api/orders/${order._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });

        it('debería responder 404 si el pedido no existe', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .get(
                        '/api/orders/64b000000000000000000000'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(404);

            expect(
                response.body.error
            ).to.equal(
                'ORDER_NOT_FOUND'
            );
        });
    });

    describe('PATCH /api/orders/:oid/status', () => {

        it('debería permitir que un admin actualice el estado', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const customer =
                await createTestCustomer();

            const order =
                await Order.create({
                    customer:
                        customer._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100,
                    status:
                        'created'
                });

            const response =
                await request(app)
                    .patch(
                        `/api/orders/${order._id}/status`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'in_transit'
                    });

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.status
            ).to.equal(
                'in_transit'
            );
        });

        it('debería responder 403 si un customer intenta cambiar el estado', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const order =
                await Order.create({
                    customer:
                        user._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .patch(
                        `/api/orders/${order._id}/status`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'in_transit'
                    });

            expect(
                response.status
            ).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });

        it('debería responder 409 si el pedido ya fue entregado', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const customer =
                await createTestCustomer();

            const order =
                await Order.create({
                    customer:
                        customer._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100,
                    status:
                        'delivered'
                });

            const response =
                await request(app)
                    .patch(
                        `/api/orders/${order._id}/status`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'created'
                    });

            expect(
                response.status
            ).to.equal(409);

            expect(
                response.body.error
            ).to.equal(
                'ORDER_ALREADY_DELIVERED'
            );
        });

        it('debería responder 400 si no se envía el estado', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const customer =
                await createTestCustomer();

            const order =
                await Order.create({
                    customer:
                        customer._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .patch(
                        `/api/orders/${order._id}/status`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({});

            expect(
                response.status
            ).to.equal(400);

            expect(
                response.body.error
            ).to.equal(
                'VALIDATION_ERROR'
            );
        });
    });

    describe('DELETE /api/orders/:oid', () => {

        it('debería permitir que un admin elimine un pedido', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const customer =
                await createTestCustomer();

            const order =
                await Order.create({
                    customer:
                        customer._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .delete(
                        `/api/orders/${order._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.message
            ).to.equal(
                'Pedido eliminado'
            );
        });

        it('debería responder 403 si un customer intenta eliminar un pedido', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const order =
                await Order.create({
                    customer:
                        user._id,
                    items: [
                        {
                            name:
                                'Test',
                            quantity: 1,
                            price: 100
                        }
                    ],
                    deliveryAddress:
                        'Calle Falsa 123',
                    total: 100
                });

            const response =
                await request(app)
                    .delete(
                        `/api/orders/${order._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });
    });
});