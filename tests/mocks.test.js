// tests/mocks.test.js

import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';

describe('Mocks API', () => {

    describe(
        'GET /api/mocks/mockingusers',
        () => {

            it(
                'debería generar usuarios simulados sin persistirlos',
                async () => {

                    const response =
                        await request(app)
                            .get(
                                '/api/mocks/mockingusers?count=3'
                            );

                    expect(
                        response.status
                    ).to.equal(200);

                    expect(
                        response.body.status
                    ).to.equal(
                        'success'
                    );

                    expect(
                        response.body.payload
                    ).to.have.length(3);

                    expect(
                        response.body.payload[0]
                    ).to.have.property(
                        'email'
                    );
                }
            );

            it(
                'no debería exponer passwords en los usuarios simulados',
                async () => {

                    const response =
                        await request(app)
                            .get(
                                '/api/mocks/mockingusers?count=3'
                            );

                    expect(
                        response.status
                    ).to.equal(200);

                    response.body
                        .payload
                        .forEach(
                            (user) => {

                                expect(
                                    user
                                ).to.not.have.property(
                                    'password'
                                );
                            }
                        );
                }
            );

            it(
                'debería responder 400 si la cantidad no es un número',
                async () => {

                    const response =
                        await request(app)
                            .get(
                                '/api/mocks/mockingusers?count=abc'
                            );

                    expect(
                        response.status
                    ).to.equal(400);

                    expect(
                        response.body.error
                    ).to.equal(
                        'INVALID_MOCK_QUANTITY'
                    );
                }
            );

            it(
                'debería responder 400 si la cantidad es negativa',
                async () => {

                    const response =
                        await request(app)
                            .get(
                                '/api/mocks/mockingusers?count=-5'
                            );

                    expect(
                        response.status
                    ).to.equal(400);

                    expect(
                        response.body.error
                    ).to.equal(
                        'INVALID_MOCK_QUANTITY'
                    );
                }
            );
        }
    );

    describe(
        'POST /api/mocks/generateData',
        () => {

            it(
                'debería generar y persistir datos de prueba correctamente',
                async () => {

                    const response =
                        await request(app)
                            .post(
                                '/api/mocks/generateData'
                            )
                            .send({
                                users: 5,
                                orders: 3,
                                deliveries: 3
                            });

                    expect(
                        response.status
                    ).to.equal(201);

                    expect(
                        response.body.status
                    ).to.equal(
                        'success'
                    );

                    expect(
                        response.body
                            .payload
                            .usersCreated
                    ).to.equal(5);

                    expect(
                        response.body
                            .payload
                            .ordersCreated
                    ).to.equal(3);

                    expect(
                        response.body
                            .payload
                            .deliveriesCreated
                    ).to.equal(3);
                }
            );

            it(
                'debería almacenar passwords hasheadas en usuarios generados',
                async () => {

                    const response =
                        await request(app)
                            .post(
                                '/api/mocks/generateData'
                            )
                            .send({
                                users: 5,
                                orders: 2,
                                deliveries: 2
                            });

                    expect(
                        response.status
                    ).to.equal(201);

                    const storedUsers =
                        await User
                            .find()
                            .select(
                                '+password'
                            );

                    expect(
                        storedUsers
                    ).to.have.length(5);

                    storedUsers.forEach(
                        (user) => {

                            expect(
                                user.password
                            ).to.be.a(
                                'string'
                            );

                            expect(
                                user.password
                            ).to.match(
                                /^\$2[aby]\$\d{2}\$/
                            );
                        }
                    );
                }
            );

            it(
                'debería responder 400 si alguna cantidad es inválida',
                async () => {

                    const response =
                        await request(app)
                            .post(
                                '/api/mocks/generateData'
                            )
                            .send({
                                users: 0,
                                orders: 5,
                                deliveries: 5
                            });

                    expect(
                        response.status
                    ).to.equal(400);

                    expect(
                        response.body.error
                    ).to.equal(
                        'INVALID_MOCK_QUANTITY'
                    );
                }
            );
        }
    );
});