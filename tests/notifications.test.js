
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';

import app from '../src/app.js';

import User from '../src/models/user.model.js';

import {
    normalizeWhatsappPhone
} from '../src/services/notification-provider.service.js';

import {
    notificationsEnabled,
    notificationService
} from '../src/services/notification.service.js';

import NotificationJob from '../src/models/notification-job.model.js';

async function login(role = 'customer') {
    const password = 'PasswordSeguro123!';

    const user = await User.create({
        firstName: 'Usuario',
        lastName: 'De prueba',
        role,
        email: `${randomUUID()}@example.test`,
        password: await bcrypt.hash(
            password,
            10
        )
    });

    const result = await request(app)
        .post('/api/auth/login')
        .send({
            email: user.email,
            password
        });

    expect(result.status).to.equal(200);

    return {
        user,
        token: result.body.accessToken
    };
}

describe('Bloque 12 - Notificaciones', () => {
    it(
        'valida números de WhatsApp sin inventar prefijos nacionales',
        () => {
            expect(
                normalizeWhatsappPhone(
                    '+54 9 341 123 4567'
                )
            ).to.equal(
                '5493411234567'
            );

            expect(
                normalizeWhatsappPhone(
                    '3411234567'
                )
            ).to.equal(null);

            expect(
                normalizeWhatsappPhone('')
            ).to.equal(null);
        }
    );

    it(
        'no envía avisos externos durante las pruebas',
        async () => {
            expect(
                notificationsEnabled()
            ).to.equal(false);

            const { user } = await login();

            await notificationService.orderCreated({
                _id: user._id,
                customer: user._id,
                trackingCode: 'DOPS-TEST'
            });

            expect(
                await NotificationJob.countDocuments({
                    userId: user._id
                })
            ).to.equal(0);
        }
    );

    it(
        'solo permite habilitar WhatsApp con número internacional y consentimiento',
        async () => {
            const { token } = await login();

            const route =
                '/api/notifications/preferences';

            const authorization =
                `Bearer ${token}`;

            const invalid = await request(app)
                .patch(route)
                .set(
                    'Authorization',
                    authorization
                )
                .send({
                    whatsapp: true,
                    phone: '3411234567',
                    whatsappConsent: true
                });

            expect(
                invalid.status
            ).to.equal(400);

            const noConsent = await request(app)
                .patch(route)
                .set(
                    'Authorization',
                    authorization
                )
                .send({
                    whatsapp: true,
                    phone: '+5493411234567'
                });

            expect(
                noConsent.status
            ).to.equal(400);

            const accepted = await request(app)
                .patch(route)
                .set(
                    'Authorization',
                    authorization
                )
                .send({
                    whatsapp: true,
                    phone: '+5493411234567',
                    whatsappConsent: true
                });

            expect(
                accepted.status
            ).to.equal(200);

            expect(
                accepted.body.whatsapp
            ).to.equal(true);

            const off = await request(app)
                .patch(route)
                .set(
                    'Authorization',
                    authorization
                )
                .send({
                    whatsapp: false
                });

            expect(
                off.status
            ).to.equal(200);

            expect(
                off.body.whatsapp
            ).to.equal(false);
        }
    );

    it(
        'protege el listado global de notificaciones',
        async () => {
            const customer = await login();

            const denied = await request(app)
                .get(
                    '/api/notifications/jobs'
                )
                .set(
                    'Authorization',
                    `Bearer ${customer.token}`
                );

            expect(
                denied.status
            ).to.equal(403);
        }
    );
});
