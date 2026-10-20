
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import usersRouter from './routes/users.routes.js';
import authRouter from './routes/auth.routes.js';
import loggerTestRouter from './routes/logger.routes.js';
import ordersRouter from './routes/orders.routes.js';
import deliveriesRouter from './routes/deliveries.routes.js';
import driversRouter from './routes/drivers.routes.js';
import depotsRouter from './routes/depots.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import productsRouter from './routes/products.routes.js';
import mocksRouter from './routes/mocks.routes.js';
import healthRouter from './routes/health.routes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { basicAuth } from './middleware/basicAuth.js';

import {
    apiRateLimiter,
    authRateLimiter
} from './middleware/rateLimiters.js';

import { customError } from './utils/customError.js';
import { ERROR_CODES } from './constants/error.constants.js';
import { swaggerSpec } from './docs/swagger.config.js';
import { config } from './config/env.js';

const app = express();

if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(helmet());

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (config.corsOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error('Origen no permitido por CORS')
            );
        },
        credentials: true
    })
);

app.use(express.json({ limit: '1mb' }));

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb'
    })
);

app.use(cookieParser());
app.use(apiRateLimiter);

app.use('/api/health', healthRouter);

const isProd = config.nodeEnv === 'production';

const internalGuard = isProd
    ? basicAuth
    : (_req, _res, next) => next();

app.use(
    '/api/docs',
    basicAuth,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

app.use(
    '/api/auth',
    authRateLimiter,
    authRouter
);

app.use('/api/users', usersRouter);

app.use(
    '/api/loggerTest',
    internalGuard,
    loggerTestRouter
);

app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);

// Bloque 10: administración y disponibilidad de repartidores.
app.use('/api/drivers', driversRouter);

app.use('/api/depots', depotsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/products', productsRouter);

app.use(
    '/api/mocks',
    internalGuard,
    mocksRouter
);

app.use((req, res, next) => {
    next(
        new customError(
            ERROR_CODES.ROUTE_NOT_FOUND,
            `La ruta ${req.method} ${req.originalUrl} no existe`
        )
    );
});

app.use(errorHandler);

export default app;
