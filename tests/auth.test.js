// tests/auth.test.js

import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';

async function createUser() {
    return await request(app)
        .post('/api/users')
        .send({
            firstName: 'Camilo',
            lastName: 'Venesia',
            email: 'camilo@deliveryops.com',
            password: 'PasswordSeguro123',
            role: 'customer'
        });
}

describe('Auth API', () => {

    describe('POST /api/auth/login', () => {

        it('debería iniciar sesión correctamente', async () => {
            await createUser();

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'camilo@deliveryops.com',
                    password: 'PasswordSeguro123'
                });

            expect(response.status).to.equal(200);

            expect(
                response.body
            ).to.have.property(
                'accessToken'
            );

            expect(
                response.body
            ).to.have.property(
                'user'
            );

            expect(
                response.body.user.email
            ).to.equal(
                'camilo@deliveryops.com'
            );

            expect(
                response.body.user
            ).to.not.have.property(
                'password'
            );

            expect(
                response.headers
                    ['set-cookie']
            ).to.be.an('array');

            expect(
                response.headers
                    ['set-cookie'][0]
            ).to.include(
                'deliveryops_refresh='
            );

            expect(
                response.headers
                    ['set-cookie'][0]
            ).to.include(
                'HttpOnly'
            );
        });

        it('debería responder 401 si la contraseña es incorrecta', async () => {
            await createUser();

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'camilo@deliveryops.com',
                    password: 'incorrecta'
                });

            expect(
                response.status
            ).to.equal(401);

            expect(
                response.body.error
            ).to.equal(
                'INVALID_CREDENTIALS'
            );
        });

        it('debería responder 401 si el email no existe', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'noexiste@deliveryops.com',
                    password: 'PasswordSeguro123'
                });

            expect(
                response.status
            ).to.equal(401);

            expect(
                response.body.error
            ).to.equal(
                'INVALID_CREDENTIALS'
            );
        });
    });

    describe('GET /api/auth/me', () => {

        it('debería devolver el usuario autenticado', async () => {
            await createUser();

            const loginResponse =
                await request(app)
                    .post(
                        '/api/auth/login'
                    )
                    .send({
                        email:
                            'camilo@deliveryops.com',
                        password:
                            'PasswordSeguro123'
                    });

            const accessToken =
                loginResponse.body
                    .accessToken;

            const response =
                await request(app)
                    .get('/api/auth/me')
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
                'camilo@deliveryops.com'
            );

            expect(
                response.body
            ).to.not.have.property(
                'password'
            );
        });

        it('debería responder 401 sin access token', async () => {
            const response =
                await request(app)
                    .get('/api/auth/me');

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

    describe('POST /api/auth/refresh', () => {

        it('debería generar un nuevo access token y rotar el refresh token', async () => {
            await createUser();

            const agent =
                request.agent(app);

            const loginResponse =
                await agent
                    .post(
                        '/api/auth/login'
                    )
                    .send({
                        email:
                            'camilo@deliveryops.com',
                        password:
                            'PasswordSeguro123'
                    });

            const firstAccessToken =
                loginResponse.body
                    .accessToken;

            const firstCookie =
                loginResponse.headers[
                    'set-cookie'
                ][0];

            const response =
                await agent
                    .post(
                        '/api/auth/refresh'
                    );

            expect(
                response.status
            ).to.equal(200);

            expect(
                response.body
            ).to.have.property(
                'accessToken'
            );

            expect(
                response.body
                    .accessToken
            ).to.not.equal(
                firstAccessToken
            );

            expect(
                response.headers[
                    'set-cookie'
                ]
            ).to.be.an('array');

            expect(
                response.headers[
                    'set-cookie'
                ][0]
            ).to.not.equal(
                firstCookie
            );
        });

        it('debería detectar reutilización de un refresh token', async () => {
            await createUser();

            const agent =
                request.agent(app);

            const loginResponse =
                await agent
                    .post(
                        '/api/auth/login'
                    )
                    .send({
                        email:
                            'camilo@deliveryops.com',
                        password:
                            'PasswordSeguro123'
                    });

            const oldCookie =
                loginResponse.headers[
                    'set-cookie'
                ][0].split(';')[0];

            const refreshResponse =
                await agent
                    .post(
                        '/api/auth/refresh'
                    );

            expect(
                refreshResponse.status
            ).to.equal(200);

            const reusedResponse =
                await request(app)
                    .post(
                        '/api/auth/refresh'
                    )
                    .set(
                        'Cookie',
                        oldCookie
                    );

            expect(
                reusedResponse.status
            ).to.equal(401);

            expect(
                reusedResponse.body.error
            ).to.equal(
                'REFRESH_TOKEN_REUSED'
            );
        });
    });

    describe('POST /api/auth/logout', () => {

        it('debería cerrar sesión y revocar el refresh token', async () => {
            await createUser();

            const agent =
                request.agent(app);

            const loginResponse =
                await agent
                    .post(
                        '/api/auth/login'
                    )
                    .send({
                        email:
                            'camilo@deliveryops.com',
                        password:
                            'PasswordSeguro123'
                    });

            expect(
                loginResponse.status
            ).to.equal(200);

            const logoutResponse =
                await agent
                    .post(
                        '/api/auth/logout'
                    );

            expect(
                logoutResponse.status
            ).to.equal(200);

            expect(
                logoutResponse.body.message
            ).to.equal(
                'Sesión cerrada correctamente'
            );

            const refreshResponse =
                await agent
                    .post(
                        '/api/auth/refresh'
                    );

            expect(
                refreshResponse.status
            ).to.equal(401);

            expect(
                refreshResponse.body.error
            ).to.equal(
                'INVALID_REFRESH_TOKEN'
            );
        });
    });
});