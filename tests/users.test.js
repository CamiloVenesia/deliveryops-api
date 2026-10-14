// tests/users.test.js

import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcrypt';

import app from '../src/app.js';
import User from '../src/models/user.model.js';

describe('Users API', () => {

    describe('GET /api/users', () => {

        it('debería devolver una lista vacía si no hay usuarios', async () => {
            const response = await request(app)
                .get('/api/users');

            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('items');
            expect(response.body.items).to.be.an('array');
            expect(response.body.items).to.have.length(0);
        });

        it('debería devolver los usuarios existentes sin exponer passwords', async () => {
            await User.create({
                firstName: 'Ana',
                lastName: 'Perez',
                email: 'ana@mail.com',
                password: '12345678',
                role: 'customer'
            });

            const response = await request(app)
                .get('/api/users');

            expect(response.status).to.equal(200);
            expect(response.body.items).to.have.length(1);

            expect(
                response.body.items[0]
            ).to.have.property(
                'email',
                'ana@mail.com'
            );

            expect(
                response.body.items[0]
            ).to.not.have.property(
                'password'
            );
        });

        it('debería respetar el parámetro limit', async () => {
            for (let i = 0; i < 3; i += 1) {
                await User.create({
                    firstName: `User${i}`,
                    lastName: 'Test',
                    email: `user${i}-${Date.now()}@mail.com`,
                    password: '12345678'
                });
            }

            const response = await request(app)
                .get('/api/users?limit=2');

            expect(response.status).to.equal(200);
            expect(response.body.items).to.have.length(2);
            expect(response.body.limit).to.equal(2);
            expect(response.body.total).to.equal(3);
            expect(response.body.totalPages).to.equal(2);

            response.body.items.forEach((user) => {
                expect(user).to.not.have.property(
                    'password'
                );
            });
        });
    });

    describe('POST /api/users', () => {

        it('debería crear un usuario válido sin exponer el password', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({
                    firstName: 'Juan',
                    lastName: 'Gomez',
                    email: 'juan@mail.com',
                    password: '12345678'
                });

            expect(response.status).to.equal(201);
            expect(response.body).to.have.property('_id');

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
            const plainPassword = 'PasswordSeguro123';

            const response = await request(app)
                .post('/api/users')
                .send({
                    firstName: 'Carlos',
                    lastName: 'Lopez',
                    email: 'carlos@mail.com',
                    password: plainPassword
                });

            expect(response.status).to.equal(201);

            const storedUser = await User
                .findOne({
                    email: 'carlos@mail.com'
                })
                .select('+password');

            expect(storedUser).to.not.equal(null);

            expect(
                storedUser.password
            ).to.be.a('string');

            expect(
                storedUser.password
            ).to.not.equal(
                plainPassword
            );

            expect(
                storedUser.password
            ).to.match(
                /^\$2[aby]\$\d{2}\$/
            );

            const matches = await bcrypt.compare(
                plainPassword,
                storedUser.password
            );

            expect(matches).to.equal(true);
        });

        it('debería responder 400 si faltan datos obligatorios', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({
                    firstName: 'Juan'
                });

            expect(response.status).to.equal(400);

            expect(
                response.body
            ).to.have.property(
                'status',
                'error'
            );

            expect(
                response.body
            ).to.have.property(
                'error',
                'VALIDATION_ERROR'
            );
        });

        it('debería responder 403 si se intenta crear un usuario admin', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({
                    firstName: 'Juan',
                    lastName: 'Gomez',
                    email: 'juan@mail.com',
                    password: '12345678',
                    role: 'admin'
                });

            expect(response.status).to.equal(403);

            expect(
                response.body.error
            ).to.equal(
                'FORBIDDEN'
            );
        });
    });

    describe('GET /api/users/:uid', () => {

        it('debería devolver un usuario existente sin exponer el password', async () => {
            const user = await User.create({
                firstName: 'Lucia',
                lastName: 'Martinez',
                email: 'lucia@mail.com',
                password: '12345678',
                role: 'customer'
            });

            const response = await request(app)
                .get(`/api/users/${user._id}`);

            expect(response.status).to.equal(200);

            expect(
                response.body
            ).to.have.property(
                'email',
                'lucia@mail.com'
            );

            expect(
                response.body
            ).to.not.have.property(
                'password'
            );
        });

        it('debería responder 404 si el usuario no existe', async () => {
            const response = await request(app)
                .get(
                    '/api/users/64b000000000000000000000'
                );

            expect(response.status).to.equal(404);

            expect(
                response.body.error
            ).to.equal(
                'USER_NOT_FOUND'
            );
        });
    });
});