
import { randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
import { expect } from 'chai';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/user.model.js';
import AuthSession from '../src/models/auth-session.model.js';

const password = 'PasswordSeguro123!';

async function createActor(role = 'customer') {
    const user = await User.create({
        firstName: 'Usuario',
        lastName: 'Seguridad',
        role,
        email: `${randomUUID()}@example.test`,
        password: await bcrypt.hash(password, 10)
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

function authorization(token) {
    return {
        Authorization: `Bearer ${token}`
    };
}

describe('Bloque 15 - Seguridad y permisos', () => {
    it(
        'rechaza inmediatamente el access token de una cuenta desactivada',
        async () => {
            const { user, token } = await createActor();

            await User.updateOne(
                { _id: user._id },
                { $set: { active: false } }
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set(authorization(token));

            expect(response.status).to.equal(401);

            expect(response.body.error).to.equal(
                'INVALID_ACCESS_TOKEN'
            );
        }
    );

    it(
        'aplica inmediatamente el rol actual y no el rol del JWT',
        async () => {
            const { user, token } =
                await createActor('admin');

            await User.updateOne(
                { _id: user._id },
                { $set: { role: 'customer' } }
            );

            const response = await request(app)
                .get('/api/analytics/dashboard')
                .set(authorization(token));

            expect(response.status).to.equal(403);

            expect(response.body.error).to.equal(
                'FORBIDDEN'
            );
        }
    );

    it(
        'invalida tokens de usuarios eliminados',
        async () => {
            const { user, token } = await createActor();

            await User.deleteOne({
                _id: user._id
            });

            const response = await request(app)
                .get('/api/auth/me')
                .set(authorization(token));

            expect(response.status).to.equal(401);
        }
    );

    it(
        'impide iniciar sesión a una cuenta desactivada',
        async () => {
            const { user } = await createActor();

            await User.updateOne(
                { _id: user._id },
                { $set: { active: false } }
            );

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password
                });

            expect(response.status).to.equal(401);

            expect(response.body.error).to.equal(
                'INVALID_CREDENTIALS'
            );
        }
    );

    it(
        'impide renovar la sesión desactivada y revoca sus refresh tokens',
        async () => {
            const { user } = await createActor();

            const agent = request.agent(app);

            const login = await agent
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password
                });

            expect(login.status).to.equal(200);

            await User.updateOne(
                { _id: user._id },
                { $set: { active: false } }
            );

            const response = await agent.post(
                '/api/auth/refresh'
            );

            expect(response.status).to.equal(401);

            expect(response.body.error).to.equal(
                'INVALID_REFRESH_TOKEN'
            );

            const activeSessions =
                await AuthSession.countDocuments({
                    user: user._id,
                    revokedAt: null
                });

            expect(activeSessions).to.equal(0);
        }
    );

    it(
        'rechaza Bearer malformado y evita cachear respuestas privadas',
        async () => {
            const { token } = await createActor();

            const malformed = await request(app)
                .get('/api/auth/me')
                .set(
                    'Authorization',
                    `Bearer  ${token}`
                );

            expect(malformed.status).to.equal(401);

            const allowed = await request(app)
                .get('/api/auth/me')
                .set(authorization(token));

            expect(allowed.status).to.equal(200);

            expect(
                allowed.headers['cache-control']
            ).to.equal('no-store');
        }
    );

    it(
        'rechaza credenciales incorrectas de documentación',
        async () => {
            const value = Buffer.from(
                'user:wrong-password'
            ).toString('base64');

            const denied = await request(app)
                .get('/api/docs/')
                .set(
                    'Authorization',
                    `Basic ${value}`
                );

            expect(denied.status).to.equal(401);

            expect(
                denied.headers['www-authenticate']
            ).to.include('Basic');
        }
    );
});
