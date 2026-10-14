// tests/deliveries.test.js

import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createAdminAndLogin() {
    const password =
        'AdminPassword123';

    const user =
        await User.create({
            firstName: 'Admin',
            lastName: 'DeliveryOps',
            email:
                `admin-${Date.now()}-${Math.random()}@deliveryops.com`,
            password:
                await bcrypt.hash(
                    password,
                    10
                ),
            role: 'admin'
        });

    const response =
        await request(app)
            .post('/api/auth/login')
            .send({
                email: user.email,
                password
            });

    return {
        user,
        accessToken:
            response.body.accessToken
    };
}

async function createUserAndLogin(
    role = 'customer'
) {
    const password =
        'PasswordSeguro123';

    const email =
        `${role}-${Date.now()}-${Math.random()}@deliveryops.com`;

    const createResponse =
        await request(app)
            .post('/api/users')
            .send({
                firstName: role,
                lastName: 'Test',
                email,
                password,
                role
            });

    const loginResponse =
        await request(app)
            .post('/api/auth/login')
            .send({
                email,
                password
            });

    return {
        user:
            createResponse.body,
        accessToken:
            loginResponse.body.accessToken
    };
}

async function createOrder(customerId) {
    return await Order.create({
        customer: customerId,

        items: [
            {
                name: 'Producto test',
                quantity: 1,
                price: 100
            }
        ],

        deliveryAddress:
            'Calle Falsa 123',

        total: 100,

        status: 'created'
    });
}

describe('Deliveries API', () => {

    describe('GET /api/deliveries', () => {

        it('debería permitir que un admin vea todas las entregas', async () => {
            const {
                accessToken
            } =
                await createAdminAndLogin();

            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const driver =
                await createUserAndLogin(
                    'driver'
                );

            const order =
                await createOrder(
                    customer.user._id
                );

            await Delivery.create({
                order:
                    order._id,

                driver:
                    driver.user._id,

                status:
                    'assigned'
            });

            const response =
                await request(app)
                    .get(
                        '/api/deliveries'
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
        });

        it('debería permitir que un driver vea solamente sus entregas', async () => {
            const driver1 =
                await createUserAndLogin(
                    'driver'
                );

            const driver2 =
                await createUserAndLogin(
                    'driver'
                );

            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const order1 =
                await createOrder(
                    customer.user._id
                );

            const order2 =
                await createOrder(
                    customer.user._id
                );

            await Delivery.create({
                order:
                    order1._id,
                driver:
                    driver1.user._id,
                status:
                    'assigned'
            });

            await Delivery.create({
                order:
                    order2._id,
                driver:
                    driver2.user._id,
                status:
                    'assigned'
            });

            const response =
                await request(app)
                    .get(
                        '/api/deliveries'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${driver1.accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.items
            ).to.have.length(1);

            expect(
                response.body.items[0]
                    .driver
            ).to.equal(
                driver1.user._id
            );
        });

        it('debería permitir que un customer vea solamente entregas de sus pedidos', async () => {
            const customer1 =
                await createUserAndLogin(
                    'customer'
                );

            const customer2 =
                await createUserAndLogin(
                    'customer'
                );

            const driver =
                await createUserAndLogin(
                    'driver'
                );

            const order1 =
                await createOrder(
                    customer1.user._id
                );

            const order2 =
                await createOrder(
                    customer2.user._id
                );

            await Delivery.create({
                order:
                    order1._id,
                driver:
                    driver.user._id,
                status:
                    'assigned'
            });

            await Delivery.create({
                order:
                    order2._id,
                driver:
                    driver.user._id,
                status:
                    'assigned'
            });

            const response =
                await request(app)
                    .get(
                        '/api/deliveries'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${customer1.accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.items
            ).to.have.length(1);

            expect(
                response.body.items[0]
                    .order
            ).to.equal(
                order1._id.toString()
            );
        });

        it('debería responder 401 sin autenticación', async () => {
            const response =
                await request(app)
                    .get(
                        '/api/deliveries'
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

    describe('GET /api/deliveries/:did', () => {

        it('debería permitir que el driver asignado vea la entrega', async () => {
            const driver =
                await createUserAndLogin(
                    'driver'
                );

            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const order =
                await createOrder(
                    customer.user._id
                );

            const delivery =
                await Delivery.create({
                    order:
                        order._id,
                    driver:
                        driver.user._id,
                    status:
                        'assigned'
                });

            const response =
                await request(app)
                    .get(
                        `/api/deliveries/${delivery._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${driver.accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body._id
            ).to.equal(
                delivery._id.toString()
            );
        });

        it('debería impedir que otro driver vea la entrega', async () => {
            const driver1 =
                await createUserAndLogin(
                    'driver'
                );

            const driver2 =
                await createUserAndLogin(
                    'driver'
                );

            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const order =
                await createOrder(
                    customer.user._id
                );

            const delivery =
                await Delivery.create({
                    order:
                        order._id,
                    driver:
                        driver1.user._id,
                    status:
                        'assigned'
                });

            const response =
                await request(app)
                    .get(
                        `/api/deliveries/${delivery._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${driver2.accessToken}`
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

    describe('POST /api/deliveries', () => {

        it('debería permitir que un admin cree una entrega', async () => {
            const admin =
                await createAdminAndLogin();

            const driver =
                await createUserAndLogin(
                    'driver'
                );

            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const order =
                await createOrder(
                    customer.user._id
                );

            const response =
                await request(app)
                    .post(
                        '/api/deliveries'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${admin.accessToken}`
                    )
                    .send({
                        order:
                            order._id.toString(),
                        driver:
                            driver.user._id,
                        priority:
                            'normal'
                    });

            expect(
                response.status
            ).to.equal(201);

            expect(
                response.body.driver
            ).to.equal(
                driver.user._id
            );

            expect(
                response.body.status
            ).to.equal(
                'assigned'
            );
        });

        it('debería impedir que un customer cree una entrega', async () => {
            const customer =
                await createUserAndLogin(
                    'customer'
                );

            const response =
                await request(app)
                    .post(
                        '/api/deliveries'
                    )
                    .set(
                        'Authorization',
                        `Bearer ${customer.accessToken}`
                    )
                    .send({});

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

    describe(
        'PATCH /api/deliveries/:did/status',
        () => {

            it('debería permitir que el driver asignado actualice la entrega', async () => {
                const driver =
                    await createUserAndLogin(
                        'driver'
                    );

                const customer =
                    await createUserAndLogin(
                        'customer'
                    );

                const order =
                    await createOrder(
                        customer.user._id
                    );

                const delivery =
                    await Delivery.create({
                        order:
                            order._id,
                        driver:
                            driver.user._id,
                        status:
                            'assigned'
                    });

                const response =
                    await request(app)
                        .patch(
                            `/api/deliveries/${delivery._id}/status`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${driver.accessToken}`
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

            it('debería impedir que otro driver actualice la entrega', async () => {
                const driver1 =
                    await createUserAndLogin(
                        'driver'
                    );

                const driver2 =
                    await createUserAndLogin(
                        'driver'
                    );

                const customer =
                    await createUserAndLogin(
                        'customer'
                    );

                const order =
                    await createOrder(
                        customer.user._id
                    );

                const delivery =
                    await Delivery.create({
                        order:
                            order._id,
                        driver:
                            driver1.user._id,
                        status:
                            'assigned'
                    });

                const response =
                    await request(app)
                        .patch(
                            `/api/deliveries/${delivery._id}/status`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${driver2.accessToken}`
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
        }
    );

    describe(
        'DELETE /api/deliveries/:did',
        () => {

            it('debería permitir que un admin elimine una entrega', async () => {
                const admin =
                    await createAdminAndLogin();

                const driver =
                    await createUserAndLogin(
                        'driver'
                    );

                const customer =
                    await createUserAndLogin(
                        'customer'
                    );

                const order =
                    await createOrder(
                        customer.user._id
                    );

                const delivery =
                    await Delivery.create({
                        order:
                            order._id,
                        driver:
                            driver.user._id,
                        status:
                            'assigned'
                    });

                const response =
                    await request(app)
                        .delete(
                            `/api/deliveries/${delivery._id}`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${admin.accessToken}`
                        );

                expect(
                    response.status
                ).to.equal(200);

                expect(
                    response.body.message
                ).to.equal(
                    'Entrega eliminada'
                );
            });

            it('debería impedir que un driver elimine una entrega', async () => {
                const driver =
                    await createUserAndLogin(
                        'driver'
                    );

                const customer =
                    await createUserAndLogin(
                        'customer'
                    );

                const order =
                    await createOrder(
                        customer.user._id
                    );

                const delivery =
                    await Delivery.create({
                        order:
                            order._id,
                        driver:
                            driver.user._id,
                        status:
                            'assigned'
                    });

                const response =
                    await request(app)
                        .delete(
                            `/api/deliveries/${delivery._id}`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${driver.accessToken}`
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
        }
    );
});