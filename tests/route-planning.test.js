
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';

import app from '../src/app.js';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

async function actor(role) {
    const password = 'PasswordSeguro123!';

    const user = await User.create({
        firstName: 'Persona',
        lastName: role,
        role,
        email: `${randomUUID()}@example.test`,
        password: await bcrypt.hash(
            password,
            10
        )
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

async function makeDelivery(
    customer,
    driver,
    latitude,
    longitude,
    withStart = false
) {
    const order = await Order.create({
        customer: customer._id,
        items: [
            {
                name: 'Paquete',
                quantity: 1,
                price: 100
            }
        ],
        deliveryAddress: 'Rosario, Argentina',
        ...(
            latitude == null
                ? {}
                : {
                    deliveryAddressDetails: {
                        latitude,
                        longitude
                    }
                }
        ),
        total: 100,
        status: 'assigned'
    });

    const delivery = await Delivery.create({
        order: order._id,
        driver: driver._id,
        status: 'assigned',
        ...(
            withStart
                ? {
                    route: {
                        origin: {
                            latitude: -32.951,
                            longitude: -60.647
                        }
                    }
                }
                : {}
        )
    });

    return { order, delivery };
}

describe('Bloque 13 - Planificación de rutas', () => {
    it(
        'requiere autenticación y respeta el propietario repartidor',
        async () => {
            const driver = await actor('driver');
            const other = await actor('driver');
            const customer = await actor('customer');

            const url =
                `/api/route-planning/drivers/${driver.user.id}`;

            const unauthenticated =
                await request(app).get(url);

            expect(
                unauthenticated.status
            ).to.equal(401);

            const deniedCustomer =
                await request(app)
                    .get(url)
                    .set(
                        'Authorization',
                        `Bearer ${customer.token}`
                    );

            expect(
                deniedCustomer.status
            ).to.equal(403);

            const deniedOther =
                await request(app)
                    .get(url)
                    .set(
                        'Authorization',
                        `Bearer ${other.token}`
                    );

            expect(
                deniedOther.status
            ).to.equal(403);

            const own = await request(app)
                .get(url)
                .set(
                    'Authorization',
                    `Bearer ${driver.token}`
                );

            expect(own.status).to.equal(200);
            expect(own.body.status).to.equal('empty');
        }
    );

    it(
        'no inventa distancia ni ETA si faltan coordenadas',
        async () => {
            const admin = await actor('admin');
            const driver = await actor('driver');
            const customer = await actor('customer');

            await makeDelivery(
                customer.user,
                driver.user,
                null,
                null
            );

            const response = await request(app)
                .get(
                    `/api/route-planning/drivers/${driver.user.id}`
                )
                .set(
                    'Authorization',
                    `Bearer ${admin.token}`
                );

            expect(response.status).to.equal(200);

            expect(
                response.body.status
            ).to.equal('needs_coordinates');

            expect(
                response.body.route
            ).to.equal(null);

            expect(
                response.body.missingCoordinates
            ).to.have.length(1);
        }
    );

    it(
        'ordena paradas según el motor de calles y calcula ETA acumulados',
        async () => {
            const admin = await actor('admin');
            const driver = await actor('driver');
            const customer = await actor('customer');

            const first = await makeDelivery(
                customer.user,
                driver.user,
                -32.96,
                -60.65,
                true
            );

            const second = await makeDelivery(
                customer.user,
                driver.user,
                -32.97,
                -60.67
            );

            const originalFetch = globalThis.fetch;

            const originalBase =
                process.env.ROUTING_OSRM_BASE_URL;

            process.env.ROUTING_OSRM_BASE_URL =
                'https://routing.example.test';

            globalThis.fetch = async url => {
                expect(String(url))
                    .to.include('/trip/v1/driving/');

                return {
                    ok: true,

                    json: async () => ({
                        code: 'Ok',

                        waypoints: [
                            { waypoint_index: 0 },
                            { waypoint_index: 2 },
                            { waypoint_index: 1 }
                        ],

                        trips: [
                            {
                                distance: 6000,
                                duration: 900,

                                legs: [
                                    {
                                        distance: 2000,
                                        duration: 300
                                    },
                                    {
                                        distance: 4000,
                                        duration: 600
                                    }
                                ],

                                geometry: {
                                    coordinates: [
                                        [-60.647, -32.951],
                                        [-60.67, -32.97],
                                        [-60.65, -32.96]
                                    ]
                                }
                            }
                        ]
                    })
                };
            };

            try {
                const response = await request(app)
                    .get(
                        `/api/route-planning/drivers/${driver.user.id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${admin.token}`
                    );

                expect(response.status).to.equal(200);

                expect(
                    response.body.status
                ).to.equal('ready');

                expect(
                    response.body.stops.map(
                        stop => stop.deliveryId
                    )
                ).to.deep.equal([
                    second.delivery.id,
                    first.delivery.id
                ]);

                expect(
                    response.body.stops.map(
                        stop =>
                            stop.arrivalMinutesFromStart
                    )
                ).to.deep.equal([5, 15]);

                expect(
                    response.body.route.distanceKm
                ).to.equal(6);

                expect(
                    response.body.route.estimatedDurationMinutes
                ).to.equal(15);

                expect(
                    response.body.route.includesLiveTraffic
                ).to.equal(false);
            } finally {
                globalThis.fetch = originalFetch;

                if (originalBase === undefined) {
                    delete process.env.ROUTING_OSRM_BASE_URL;
                } else {
                    process.env.ROUTING_OSRM_BASE_URL =
                        originalBase;
                }
            }
        }
    );
});
