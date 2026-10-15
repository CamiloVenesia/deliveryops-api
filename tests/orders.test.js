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
            firstName:
                'Admin',

            lastName:
                'DeliveryOps',

            email:
                `admin-${Date.now()}-${Math.random()}@deliveryops.com`,

            password:
                await bcrypt.hash(
                    password,
                    10
                ),

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
            .post(
                '/api/users'
            )
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

async function createTestDriver() {
    return await User.create({
        firstName:
            'Driver',

        lastName:
            'Test',

        email:
            `driver-${Date.now()}-${Math.random()}@mail.com`,

        password:
            'hash-interno-test',

        role:
            'driver'
    });
}

async function createOrder({
    customerId,
    status = 'created',
    delivery = null
}) {
    return await Order.create({
        customer:
            customerId,

        items: [
            {
                name:
                    'Producto test',

                quantity:
                    1,

                price:
                    100
            }
        ],

        deliveryAddress:
            'Calle Falsa 123',

        total:
            100,

        status,

        delivery
    });
}

describe(
    'Orders API',
    () => {

        describe(
            'GET /api/orders',
            () => {

                it(
                    'debería devolver una lista vacía para un admin si no hay pedidos',
                    async () => {
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
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .items
                        ).to.be.an(
                            'array'
                        );

                        expect(
                            response.body
                                .items
                        ).to.have.length(
                            0
                        );

                        expect(
                            response.body
                                .page
                        ).to.equal(
                            1
                        );

                        expect(
                            response.body
                                .total
                        ).to.equal(
                            0
                        );
                    }
                );

                it(
                    'debería permitir que un customer vea solamente sus pedidos',
                    async () => {
                        const {
                            user,
                            accessToken
                        } =
                            await createCustomerAndLogin();

                        const otherCustomer =
                            await createTestCustomer();

                        await createOrder({
                            customerId:
                                user._id
                        });

                        await createOrder({
                            customerId:
                                otherCustomer._id
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
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .items
                        ).to.have.length(
                            1
                        );

                        expect(
                            response.body
                                .items[0]
                                .customer
                        ).to.equal(
                            user._id
                        );
                    }
                );

                it(
                    'debería responder 401 sin autenticación',
                    async () => {
                        const response =
                            await request(app)
                                .get(
                                    '/api/orders'
                                );

                        expect(
                            response.status
                        ).to.equal(
                            401
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'UNAUTHORIZED'
                        );
                    }
                );
            }
        );

        describe(
            'POST /api/orders',
            () => {

                it(
                    'debería permitir que un customer cree su propio pedido y registrar el historial inicial',
                    async () => {
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

                                            quantity:
                                                2,

                                            price:
                                                1500
                                        }
                                    ],

                                    deliveryAddress:
                                        'Calle Falsa 123'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            201
                        );

                        expect(
                            response.body
                                .order
                                .total
                        ).to.equal(
                            3000
                        );

                        expect(
                            response.body
                                .order
                                .status
                        ).to.equal(
                            'created'
                        );

                        expect(
                            response.body
                                .order
                                .customer
                        ).to.equal(
                            user._id
                        );

                        expect(
                            response.body
                                .order
                                .statusHistory
                        ).to.have.length(
                            1
                        );

                        const history =
                            response.body
                                .order
                                .statusHistory[0];

                        expect(
                            history.from
                        ).to.equal(
                            null
                        );

                        expect(
                            history.to
                        ).to.equal(
                            'created'
                        );

                        expect(
                            history.changedByRole
                        ).to.equal(
                            'customer'
                        );

                        expect(
                            history.source
                        ).to.equal(
                            'order'
                        );

                        expect(
                            history.changedBy
                        ).to.equal(
                            user._id
                        );
                    }
                );

                it(
                    'debería impedir que un customer cree un pedido para otro usuario',
                    async () => {
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

                                            quantity:
                                                1,

                                            price:
                                                100
                                        }
                                    ],

                                    deliveryAddress:
                                        'Calle Falsa 123'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            403
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'FORBIDDEN'
                        );
                    }
                );

                it(
                    'debería responder 400 si un admin no indica el cliente',
                    async () => {
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

                                            quantity:
                                                1,

                                            price:
                                                100
                                        }
                                    ],

                                    deliveryAddress:
                                        'Calle Falsa 123'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            400
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'VALIDATION_ERROR'
                        );
                    }
                );

                it(
                    'debería responder 404 si el cliente no existe',
                    async () => {
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

                                            quantity:
                                                1,

                                            price:
                                                100
                                        }
                                    ],

                                    deliveryAddress:
                                        'Calle Falsa 123'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            404
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'USER_NOT_FOUND'
                        );
                    }
                );

                it(
                    'debería responder 403 si el cliente tiene rol driver',
                    async () => {
                        const {
                            accessToken
                        } =
                            await createAdminAndLogin();

                        const driver =
                            await createTestDriver();

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

                                            quantity:
                                                1,

                                            price:
                                                100
                                        }
                                    ],

                                    deliveryAddress:
                                        'Calle Falsa 123'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            403
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'FORBIDDEN'
                        );
                    }
                );
            }
        );

        describe(
            'GET /api/orders/:oid',
            () => {

                it(
                    'debería permitir que un customer vea su propio pedido',
                    async () => {
                        const {
                            user,
                            accessToken
                        } =
                            await createCustomerAndLogin();

                        const order =
                            await createOrder({
                                customerId:
                                    user._id
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
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                ._id
                        ).to.equal(
                            order._id.toString()
                        );
                    }
                );

                it(
                    'debería impedir que un customer vea un pedido ajeno',
                    async () => {
                        const {
                            accessToken
                        } =
                            await createCustomerAndLogin();

                        const otherCustomer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    otherCustomer._id
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
                        ).to.equal(
                            403
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'FORBIDDEN'
                        );
                    }
                );

                it(
                    'debería responder 404 si el pedido no existe',
                    async () => {
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
                        ).to.equal(
                            404
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'ORDER_NOT_FOUND'
                        );
                    }
                );
            }
        );

        describe(
            'PATCH /api/orders/:oid/status',
            () => {

                it(
                    'debería permitir la transición created → assigned para un admin y registrar el actor',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

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
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'assigned'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .status
                        ).to.equal(
                            'assigned'
                        );

                        expect(
                            response.body
                                .statusHistory
                        ).to.have.length(
                            1
                        );

                        const history =
                            response.body
                                .statusHistory[0];

                        expect(
                            history.from
                        ).to.equal(
                            'created'
                        );

                        expect(
                            history.to
                        ).to.equal(
                            'assigned'
                        );

                        expect(
                            history.changedByRole
                        ).to.equal(
                            'admin'
                        );

                        expect(
                            history.source
                        ).to.equal(
                            'order'
                        );

                        expect(
                            history.changedBy
                        ).to.equal(
                            admin.user._id.toString()
                        );
                    }
                );

                it(
                    'debería impedir el salto created → in_transit',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

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
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'in_transit'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            400
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'VALIDATION_ERROR'
                        );

                        const storedOrder =
                            await Order.findById(
                                order._id
                            );

                        expect(
                            storedOrder.status
                        ).to.equal(
                            'created'
                        );
                    }
                );

                it(
                    'debería permitir assigned → in_transit',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

                                status:
                                    'assigned'
                            });

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'in_transit'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .status
                        ).to.equal(
                            'in_transit'
                        );
                    }
                );

                it(
                    'debería impedir assigned → delivered',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

                                status:
                                    'assigned'
                            });

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'delivered'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            400
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'VALIDATION_ERROR'
                        );
                    }
                );

                it(
                    'debería sincronizar el estado de una entrega asociada al cambiar el pedido',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const driver =
                            await createTestDriver();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

                                status:
                                    'assigned'
                            });

                        const delivery =
                            await Delivery.create({
                                order:
                                    order._id,

                                driver:
                                    driver._id,

                                status:
                                    'assigned',

                                assignedAt:
                                    new Date()
                            });

                        order.delivery =
                            delivery._id;

                        await order.save();

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'in_transit'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            200
                        );

                        const storedDelivery =
                            await Delivery.findById(
                                delivery._id
                            );

                        expect(
                            storedDelivery.status
                        ).to.equal(
                            'in_transit'
                        );

                        expect(
                            storedDelivery
                                .statusHistory
                        ).to.have.length(
                            1
                        );

                        expect(
                            storedDelivery
                                .statusHistory[0]
                                .from
                        ).to.equal(
                            'assigned'
                        );

                        expect(
                            storedDelivery
                                .statusHistory[0]
                                .to
                        ).to.equal(
                            'in_transit'
                        );

                        expect(
                            storedDelivery
                                .statusHistory[0]
                                .source
                        ).to.equal(
                            'order'
                        );

                        expect(
                            storedDelivery
                                .statusHistory[0]
                                .changedByRole
                        ).to.equal(
                            'admin'
                        );
                    }
                );

                it(
                    'debería sincronizar la cancelación del pedido con la entrega asociada',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const driver =
                            await createTestDriver();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

                                status:
                                    'assigned'
                            });

                        const delivery =
                            await Delivery.create({
                                order:
                                    order._id,

                                driver:
                                    driver._id,

                                status:
                                    'assigned',

                                assignedAt:
                                    new Date()
                            });

                        order.delivery =
                            delivery._id;

                        await order.save();

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'cancelled'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .status
                        ).to.equal(
                            'cancelled'
                        );

                        const storedDelivery =
                            await Delivery.findById(
                                delivery._id
                            );

                        expect(
                            storedDelivery.status
                        ).to.equal(
                            'cancelled'
                        );

                        expect(
                            storedDelivery
                                .statusHistory[0]
                                .source
                        ).to.equal(
                            'order'
                        );
                    }
                );

                it(
                    'debería impedir modificar un pedido cancelado',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

                                status:
                                    'cancelled'
                            });

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'created'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            400
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'VALIDATION_ERROR'
                        );
                    }
                );

                it(
                    'debería responder 403 si un customer intenta cambiar el estado',
                    async () => {
                        const {
                            user,
                            accessToken
                        } =
                            await createCustomerAndLogin();

                        const order =
                            await createOrder({
                                customerId:
                                    user._id
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
                                        'assigned'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            403
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'FORBIDDEN'
                        );
                    }
                );

                it(
                    'debería responder 409 si el pedido ya fue entregado',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id,

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
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({
                                    status:
                                        'cancelled'
                                });

                        expect(
                            response.status
                        ).to.equal(
                            409
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'ORDER_ALREADY_DELIVERED'
                        );
                    }
                );

                it(
                    'debería responder 400 si no se envía el estado',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id
                            });

                        const response =
                            await request(app)
                                .patch(
                                    `/api/orders/${order._id}/status`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                )
                                .send({});

                        expect(
                            response.status
                        ).to.equal(
                            400
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'VALIDATION_ERROR'
                        );
                    }
                );
            }
        );

        describe(
            'DELETE /api/orders/:oid',
            () => {

                it(
                    'debería permitir que un admin elimine un pedido',
                    async () => {
                        const admin =
                            await createAdminAndLogin();

                        const customer =
                            await createTestCustomer();

                        const order =
                            await createOrder({
                                customerId:
                                    customer._id
                            });

                        const response =
                            await request(app)
                                .delete(
                                    `/api/orders/${order._id}`
                                )
                                .set(
                                    'Authorization',
                                    `Bearer ${admin.accessToken}`
                                );

                        expect(
                            response.status
                        ).to.equal(
                            200
                        );

                        expect(
                            response.body
                                .message
                        ).to.equal(
                            'Pedido eliminado'
                        );
                    }
                );

                it(
                    'debería responder 403 si un customer intenta eliminar un pedido',
                    async () => {
                        const {
                            user,
                            accessToken
                        } =
                            await createCustomerAndLogin();

                        const order =
                            await createOrder({
                                customerId:
                                    user._id
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
                        ).to.equal(
                            403
                        );

                        expect(
                            response.body
                                .error
                        ).to.equal(
                            'FORBIDDEN'
                        );
                    }
                );
            }
        );
    }
);