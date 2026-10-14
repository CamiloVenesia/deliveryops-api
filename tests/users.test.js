// tests/users.test.js

import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';

async function createAdminAndLogin() {
    const password =
        'AdminPassword123';

    const hashedPassword =
        await bcrypt.hash(
            password,
            10
        );

    await User.create({
        firstName: 'Admin',
        lastName: 'DeliveryOps',
        email: 'admin@deliveryops.com',
        password: hashedPassword,
        role: 'admin'
    });

    const response =
        await request(app)
            .post('/api/auth/login')
            .send({
                email:
                    'admin@deliveryops.com',
                password
            });

    return response.body.accessToken;
}

async function createCustomerAndLogin({
    email =
        'customer@deliveryops.com'
} = {}) {
    const password =
        'CustomerPassword123';

    const createResponse =
        await request(app)
            .post('/api/users')
            .send({
                firstName:
                    'Customer',
                lastName:
                    'DeliveryOps',
                email,
                password,
                role: 'customer'
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

describe('Users API', () => {

    describe('GET /api/users', () => {

        it('debería devolver una lista vacía si un admin consulta y no hay otros usuarios', async () => {
            const accessToken =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .get('/api/users')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body
            ).to.have.property(
                'items'
            );

            expect(
                response.body.items
            ).to.be.an('array');

            expect(
                response.body.items
            ).to.have.length(1);
        });

        it('debería devolver los usuarios existentes sin exponer passwords', async () => {
            const accessToken =
                await createAdminAndLogin();

            await User.create({
                firstName: 'Ana',
                lastName: 'Perez',
                email: 'ana@mail.com',
                password: 'hash-interno-test',
                role: 'customer'
            });

            const response =
                await request(app)
                    .get('/api/users')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.items
            ).to.have.length(2);

            const ana =
                response.body.items.find(
                    (user) =>
                        user.email ===
                        'ana@mail.com'
                );

            expect(ana).to.exist;

            expect(
                ana
            ).to.not.have.property(
                'password'
            );
        });

        it('debería respetar el parámetro limit', async () => {
            const accessToken =
                await createAdminAndLogin();

            for (
                let i = 0;
                i < 3;
                i++
            ) {
                await User.create({
                    firstName:
                        `User${i}`,
                    lastName:
                        'Test',
                    email:
                        `user${i}-${Date.now()}@mail.com`,
                    password:
                        'hash-interno-test',
                    role:
                        'customer'
                });
            }

            const response =
                await request(app)
                    .get(
                        '/api/users?limit=2'
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
            ).to.have.length(2);

            expect(
                response.body.limit
            ).to.equal(2);

            expect(
                response.body.total
            ).to.equal(4);

            expect(
                response.body.totalPages
            ).to.equal(2);
        });

        it('debería responder 401 sin autenticación', async () => {
            const response =
                await request(app)
                    .get('/api/users');

            expect(
                response.status
            ).to.equal(401);

            expect(
                response.body.error
            ).to.equal(
                'UNAUTHORIZED'
            );
        });

        it('debería responder 403 si un customer intenta listar usuarios', async () => {
            const {
                accessToken
            } =
                await createCustomerAndLogin();

            const response =
                await request(app)
                    .get('/api/users')
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

    describe('POST /api/users', () => {

        it('debería crear un usuario válido sin exponer el password', async () => {
            const response =
                await request(app)
                    .post('/api/users')
                    .send({
                        firstName:
                            'Juan',
                        lastName:
                            'Gomez',
                        email:
                            'juan@mail.com',
                        password:
                            '12345678'
                    });

            expect(
                response.status
            ).to.equal(201);

            expect(
                response.body
            ).to.have.property(
                '_id'
            );

            expect(
                response.body
            ).to.have.property(
                'role',
                'customer'
            );

            expect(
                response.body
            ).to.not.have.property(
                'password'
            );
        });

        it('debería almacenar el password hasheado con bcrypt', async () => {
            const password =
                'PasswordSeguro123';

            const response =
                await request(app)
                    .post('/api/users')
                    .send({
                        firstName:
                            'Juan',
                        lastName:
                            'Gomez',
                        email:
                            'juan@mail.com',
                        password
                    });

            expect(
                response.status
            ).to.equal(201);

            const storedUser =
                await User
                    .findById(
                        response.body._id
                    )
                    .select(
                        '+password'
                    );

            expect(
                storedUser.password
            ).to.not.equal(
                password
            );

            expect(
                await bcrypt.compare(
                    password,
                    storedUser.password
                )
            ).to.equal(true);
        });

        it('debería responder 400 si faltan datos obligatorios', async () => {
            const response =
                await request(app)
                    .post('/api/users')
                    .send({
                        firstName:
                            'Juan'
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

        it('debería responder 403 si se intenta crear un usuario admin', async () => {
            const response =
                await request(app)
                    .post('/api/users')
                    .send({
                        firstName:
                            'Juan',
                        lastName:
                            'Gomez',
                        email:
                            'juan@mail.com',
                        password:
                            '12345678',
                        role:
                            'admin'
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

    describe('GET /api/users/:uid', () => {

        it('debería permitir que un usuario consulte su propio perfil', async () => {
            const {
                user,
                accessToken
            } =
                await createCustomerAndLogin();

            const response =
                await request(app)
                    .get(
                        `/api/users/${user._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.email
            ).to.equal(
                user.email
            );

            expect(
                response.body
            ).to.not.have.property(
                'password'
            );
        });

        it('debería impedir que un usuario consulte otro perfil', async () => {
            const {
                accessToken
            } =
                await createCustomerAndLogin();

            const otherUser =
                await User.create({
                    firstName:
                        'Otro',
                    lastName:
                        'Usuario',
                    email:
                        'otro@mail.com',
                    password:
                        'hash-interno-test',
                    role:
                        'customer'
                });

            const response =
                await request(app)
                    .get(
                        `/api/users/${otherUser._id}`
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

        it('debería permitir que un admin consulte cualquier usuario', async () => {
            const accessToken =
                await createAdminAndLogin();

            const user =
                await User.create({
                    firstName:
                        'Ana',
                    lastName:
                        'Perez',
                    email:
                        'ana@mail.com',
                    password:
                        'hash-interno-test',
                    role:
                        'customer'
                });

            const response =
                await request(app)
                    .get(
                        `/api/users/${user._id}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body.email
            ).to.equal(
                'ana@mail.com'
            );
        });

        it('debería responder 404 si el usuario no existe', async () => {
            const accessToken =
                await createAdminAndLogin();

            const response =
                await request(app)
                    .get(
                        '/api/users/64b000000000000000000000'
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
                'USER_NOT_FOUND'
            );
        });
    });
});