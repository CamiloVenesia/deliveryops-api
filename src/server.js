
import mongoose from 'mongoose';

import app from './app.js';

import {
    config
} from './config/env.js';

import logger from './utils/logger.js';

import {
    notificationWorkerService
} from './services/notification-worker.service.js';

mongoose
    .connect(config.mongoUrl)
    .then(() => {
        logger.info(
            'Conexión a MongoDB establecida'
        );

        app.listen(
            config.port,
            () => {
                notificationWorkerService.start();

                logger.info(
                    `Servidor DeliveryOps escuchando en el puerto ${config.port} (entorno: ${config.nodeEnv})`
                );
            }
        );
    })
    .catch(error => {
        logger.fatal(
            `No se pudo conectar a MongoDB: ${error.message}`
        );

        process.exit(1);
    });
