// src/docs/swagger.config.js

import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'DeliveryOps API',
            version: '1.0.0',
            description:
                'API REST de DeliveryOps — Plataforma de gestión de entregas y operaciones logísticas. Permite administrar usuarios, pedidos, entregas, documentos y datos de prueba.'
        },

        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor local'
            }
        ]
    },

    apis: ['./src/docs/**/*.yaml']
};

export const swaggerSpec =
    swaggerJSDoc(swaggerOptions);