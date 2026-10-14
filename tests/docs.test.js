// tests/docs.test.js

import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';

describe('Swagger Docs', () => {
    it('debería responder 401 sin credenciales', async () => {
        const response = await request(app).get('/api/docs/');

        expect(response.status).to.equal(401);
    });

    it('debería responder 200 con las credenciales correctas', async () => {
        const credentials = Buffer.from(
            'dev:deliveryops123'
        ).toString('base64');

        const response = await request(app)
            .get('/api/docs/')
            .set('Authorization', `Basic ${credentials}`);

        expect(response.status).to.equal(200);
    });
});