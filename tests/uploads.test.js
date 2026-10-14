// tests/uploads.test.js

import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function createUserAndLogin(
    role = 'customer'
) {
    const email =
        `${role}-${Date.now()}-${Math.random()}@deliveryops.com`;

    const password =
        'PasswordSeguro123';

    const createResponse =
        await request(app)
            .post('/api/users')
            .send({
                firstName: 'Test',
                lastName: 'User',
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
            loginResponse.body
                .accessToken
    };
}

async function createAdminAndLogin() {
    const email =
        `admin-${Date.now()}-${Math.random()}@deliveryops.com`;

    const password =
        'AdminPassword123';

    await User.create({
        firstName: 'Admin',
        lastName: 'DeliveryOps',
        email,
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
                email,
                password
            });

    return {
        accessToken:
            response.body
                .accessToken
    };
}

describe('Uploads API', () => {

    describe(
        'POST /api/users/:uid/documents',
        () => {

            it('debería cargar un documento válido correctamente', async () => {
                const {
                    user,
                    accessToken
                } =
                    await createUserAndLogin();

                const response =
                    await request(app)
                        .post(
                            `/api/users/${user._id}/documents`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .field(
                            'documentType',
                            'dni'
                        )
                        .attach(
                            'document',
                            Buffer.from(
                                'contenido de prueba'
                            ),
                            {
                                filename:
                                    'dni.pdf',
                                contentType:
                                    'application/pdf'
                            }
                        );

                expect(
                    response.status
                ).to.equal(201);

                expect(
                    response.body.documents
                ).to.have.length(1);

                expect(
                    response.body.documents[0]
                ).to.have.property(
                    'documentType',
                    'dni'
                );

                expect(
                    response.body.documents[0]
                ).to.have.property(
                    'originalName',
                    'dni.pdf'
                );
            });

            it('debería responder 400 si falta el archivo', async () => {
                const {
                    user,
                    accessToken
                } =
                    await createUserAndLogin();

                const response =
                    await request(app)
                        .post(
                            `/api/users/${user._id}/documents`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .field(
                            'documentType',
                            'dni'
                        );

                expect(
                    response.status
                ).to.equal(400);

                expect(
                    response.body.error
                ).to.equal(
                    'FILE_REQUIRED'
                );
            });

            it('debería responder 400 si el tipo de documento es inválido', async () => {
                const {
                    user,
                    accessToken
                } =
                    await createUserAndLogin();

                const response =
                    await request(app)
                        .post(
                            `/api/users/${user._id}/documents`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .field(
                            'documentType',
                            'pasaporte_invalido'
                        )
                        .attach(
                            'document',
                            Buffer.from(
                                'contenido'
                            ),
                            {
                                filename:
                                    'doc.pdf',
                                contentType:
                                    'application/pdf'
                            }
                        );

                expect(
                    response.status
                ).to.equal(400);

                expect(
                    response.body.error
                ).to.equal(
                    'INVALID_DOCUMENT_TYPE'
                );
            });

            it('debería responder 400 si el tipo de archivo no está permitido', async () => {
                const {
                    user,
                    accessToken
                } =
                    await createUserAndLogin();

                const response =
                    await request(app)
                        .post(
                            `/api/users/${user._id}/documents`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .field(
                            'documentType',
                            'dni'
                        )
                        .attach(
                            'document',
                            Buffer.from(
                                'contenido'
                            ),
                            {
                                filename:
                                    'virus.exe',
                                contentType:
                                    'application/x-msdownload'
                            }
                        );

                expect(
                    response.status
                ).to.equal(400);

                expect(
                    response.body.error
                ).to.equal(
                    'INVALID_FILE_TYPE'
                );
            });

            it('debería responder 404 si el usuario no existe', async () => {
                const {
                    accessToken
                } =
                    await createAdminAndLogin();

                const response =
                    await request(app)
                        .post(
                            '/api/users/64b000000000000000000000/documents'
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .field(
                            'documentType',
                            'dni'
                        )
                        .attach(
                            'document',
                            Buffer.from(
                                'contenido'
                            ),
                            {
                                filename:
                                    'dni.pdf',
                                contentType:
                                    'application/pdf'
                            }
                        );

                expect(
                    response.status
                ).to.equal(404);

                expect(
                    response.body.error
                ).to.equal(
                    'USER_NOT_FOUND'
                );
            });
        }
    );

    describe(
        'POST /api/orders/:oid/receipt',
        () => {

            it('debería asociar un comprobante a un pedido propio', async () => {
                const {
                    user,
                    accessToken
                } =
                    await createUserAndLogin(
                        'customer'
                    );

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

                        total: 100,

                        status:
                            'created'
                    });

                const response =
                    await request(app)
                        .post(
                            `/api/orders/${order._id}/receipt`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .attach(
                            'receipt',
                            Buffer.from(
                                'comprobante'
                            ),
                            {
                                filename:
                                    'comprobante.jpg',
                                contentType:
                                    'image/jpeg'
                            }
                        );

                expect(
                    response.status
                ).to.equal(201);

                expect(
                    response.body.receipt
                ).to.have.property(
                    'originalName',
                    'comprobante.jpg'
                );
            });

            it('debería responder 404 si el pedido no existe', async () => {
                const {
                    accessToken
                } =
                    await createAdminAndLogin();

                const response =
                    await request(app)
                        .post(
                            '/api/orders/64b000000000000000000000/receipt'
                        )
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .attach(
                            'receipt',
                            Buffer.from(
                                'comprobante'
                            ),
                            {
                                filename:
                                    'comprobante.jpg',
                                contentType:
                                    'image/jpeg'
                            }
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
        }
    );

    describe(
        'POST /api/deliveries/:did/receipt',
        () => {

            it('debería permitir que el driver asignado cargue un comprobante', async () => {
                const customer =
                    await createUserAndLogin(
                        'customer'
                    );

                const driver =
                    await createUserAndLogin(
                        'driver'
                    );

                const order =
                    await Order.create({
                        customer:
                            customer.user._id,

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
                            'assigned'
                    });

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
                        .post(
                            `/api/deliveries/${delivery._id}/receipt`
                        )
                        .set(
                            'Authorization',
                            `Bearer ${driver.accessToken}`
                        )
                        .attach(
                            'receipt',
                            Buffer.from(
                                'comprobante'
                            ),
                            {
                                filename:
                                    'comprobante.png',
                                contentType:
                                    'image/png'
                            }
                        );

                expect(
                    response.status
                ).to.equal(201);

                expect(
                    response.body.receipt
                ).to.have.property(
                    'originalName',
                    'comprobante.png'
                );
            });

            it('debería responder 404 si la entrega no existe', async () => {
                const driver =
                    await createUserAndLogin(
                        'driver'
                    );

                const response =
                    await request(app)
                        .post(
                            '/api/deliveries/64b000000000000000000000/receipt'
                        )
                        .set(
                            'Authorization',
                            `Bearer ${driver.accessToken}`
                        )
                        .attach(
                            'receipt',
                            Buffer.from(
                                'comprobante'
                            ),
                            {
                                filename:
                                    'comprobante.png',
                                contentType:
                                    'image/png'
                            }
                        );

                expect(
                    response.status
                ).to.equal(404);

                expect(
                    response.body.error
                ).to.equal(
                    'DELIVERY_NOT_FOUND'
                );
            });
        }
    );
});