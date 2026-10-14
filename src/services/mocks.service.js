// src/services/mocks.service.js

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

import { mocksRepository } from '../repositories/mocks.repository.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import logger from '../utils/logger.js';

const USER_ROLES = [
    'admin',
    'customer',
    'driver',
    'store'
];

const ORDER_STATUSES = [
    'created',
    'assigned',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
];

const DELIVERY_STATUSES = [
    'pending',
    'assigned',
    'in_transit',
    'delivered'
];

const PRIORITIES = [
    'low',
    'normal',
    'high'
];

const PASSWORD_SALT_ROUNDS = 10;

function parseCount(
    raw,
    fieldName,
    defaultValue = 10
) {
    if (
        raw === undefined ||
        raw === null ||
        raw === ''
    ) {
        return defaultValue;
    }

    const num = Number(raw);

    if (
        !Number.isInteger(num) ||
        num <= 0
    ) {
        logger.warning(
            `Cantidad inválida recibida en "${fieldName}": "${raw}"`
        );

        throw new customError(
            ERROR_CODES.INVALID_MOCK_QUANTITY,
            `El parámetro "${fieldName}" debe ser un número entero mayor a 0 (recibido: "${raw}")`
        );
    }

    return num;
}

function removePassword(user) {
    const {
        password,
        ...safeUser
    } = user;

    return safeUser;
}

export const mocksService = {

    generateUser(overrides = {}) {
        const role =
            overrides.role ||
            faker.helpers.arrayElement(
                USER_ROLES
            );

        const user = {
            firstName:
                faker.person.firstName(),

            lastName:
                faker.person.lastName(),

            email:
                faker.internet
                    .email()
                    .toLowerCase(),

            password:
                faker.internet.password({
                    length: 12
                }),

            role
        };

        return {
            ...user,
            ...overrides
        };
    },

    generateUsers(rawCount) {
        const count =
            parseCount(
                rawCount,
                'count'
            );

        return Array
            .from(
                {
                    length: count
                },
                () => this.generateUser()
            )
            .map(removePassword);
    },

    generateOrder(
        customerId = null
    ) {
        const itemsCount =
            faker.number.int({
                min: 1,
                max: 5
            });

        const items =
            Array.from(
                {
                    length: itemsCount
                },
                () => ({
                    name:
                        faker.commerce.productName(),

                    quantity:
                        faker.number.int({
                            min: 1,
                            max: 10
                        }),

                    price:
                        Number(
                            faker.commerce.price({
                                min: 100,
                                max: 5000
                            })
                        )
                })
            );

        const total =
            items.reduce(
                (acc, item) =>
                    acc +
                    item.price *
                    item.quantity,
                0
            );

        return {
            customer:
                customerId ||
                new mongoose.Types.ObjectId(),

            items,

            deliveryAddress:
                faker.location.streetAddress(),

            total,

            status:
                faker.helpers.arrayElement(
                    ORDER_STATUSES
                ),

            priority:
                faker.helpers.arrayElement(
                    PRIORITIES
                )
        };
    },

    generateOrders(rawCount) {
        const count =
            parseCount(
                rawCount,
                'count'
            );

        return Array.from(
            {
                length: count
            },
            () => this.generateOrder()
        );
    },

    generateDelivery(
        orderId = null,
        driverId = null
    ) {
        const status =
            faker.helpers.arrayElement(
                DELIVERY_STATUSES
            );

        let assignedAt = null;
        let deliveredAt = null;

        if (
            status !== 'pending'
        ) {
            assignedAt =
                faker.date.recent({
                    days: 5
                });
        }

        if (
            status === 'delivered'
        ) {
            deliveredAt =
                faker.date.between({
                    from: assignedAt,
                    to: new Date()
                });
        }

        return {
            order:
                orderId ||
                new mongoose.Types.ObjectId(),

            driver:
                driverId ||
                new mongoose.Types.ObjectId(),

            status,

            priority:
                faker.helpers.arrayElement(
                    PRIORITIES
                ),

            assignedAt,
            deliveredAt
        };
    },

    generateDeliveries(
        rawCount
    ) {
        const count =
            parseCount(
                rawCount,
                'count'
            );

        return Array.from(
            {
                length: count
            },
            () =>
                this.generateDelivery()
        );
    },

    async generateAndPersistData({
        users,
        orders,
        deliveries
    }) {
        const usersCount =
            parseCount(
                users,
                'users'
            );

        const ordersCount =
            parseCount(
                orders,
                'orders'
            );

        const deliveriesCount =
            parseCount(
                deliveries,
                'deliveries'
            );

        try {
            const customersCount =
                Math.max(
                    1,
                    Math.floor(
                        usersCount * 0.6
                    )
                );

            const driversCount =
                Math.max(
                    1,
                    usersCount -
                    customersCount
                );

            const usersToCreate = [
                ...Array.from(
                    {
                        length:
                            customersCount
                    },
                    () =>
                        this.generateUser({
                            role:
                                'customer'
                        })
                ),

                ...Array.from(
                    {
                        length:
                            driversCount
                    },
                    () =>
                        this.generateUser({
                            role:
                                'driver'
                        })
                )
            ];

            const usersWithHashedPasswords =
                await Promise.all(
                    usersToCreate.map(
                        async (user) => ({
                            ...user,

                            password:
                                await bcrypt.hash(
                                    user.password,
                                    PASSWORD_SALT_ROUNDS
                                )
                        })
                    )
                );

            const createdUsers =
                await mocksRepository.insertUsers(
                    usersWithHashedPasswords
                );

            const customers =
                createdUsers.filter(
                    (user) =>
                        user.role ===
                        'customer'
                );

            const drivers =
                createdUsers.filter(
                    (user) =>
                        user.role ===
                        'driver'
                );

            const createdOrders = [];

            for (
                let i = 0;
                i < ordersCount;
                i += 1
            ) {
                const customer =
                    faker.helpers.arrayElement(
                        customers
                    );

                const orderData =
                    this.generateOrder(
                        customer._id
                    );

                const createdOrder =
                    await mocksRepository.createOrder(
                        orderData
                    );

                createdOrders.push(
                    createdOrder
                );
            }

            const createdDeliveries = [];

            for (
                let i = 0;
                i < deliveriesCount;
                i += 1
            ) {
                const order =
                    faker.helpers.arrayElement(
                        createdOrders
                    );

                const driver =
                    drivers.length
                        ? faker.helpers.arrayElement(
                              drivers
                          )
                        : null;

                const deliveryData =
                    this.generateDelivery(
                        order._id,
                        driver?._id ?? null
                    );

                const createdDelivery =
                    await mocksRepository.createDelivery(
                        deliveryData
                    );

                createdDeliveries.push(
                    createdDelivery
                );

                await mocksRepository
                    .updateOrderDelivery(
                        order._id,
                        createdDelivery._id
                    );
            }

            const result = {
                usersCreated:
                    createdUsers.length,

                ordersCreated:
                    createdOrders.length,

                deliveriesCreated:
                    createdDeliveries.length
            };

            logger.info(
                `Datos de prueba generados: ${result.usersCreated} usuarios, ${result.ordersCreated} pedidos, ${result.deliveriesCreated} entregas`
            );

            return result;
        } catch (error) {
            logger.error(
                `Falló la generación/carga de datos de prueba: ${error.message}`
            );

            throw new customError(
                ERROR_CODES.MOCK_GENERATION_FAILED,
                `Falló la generación/carga de datos de prueba: ${error.message}`
            );
        }
    }
};