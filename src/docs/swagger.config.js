// src/docs/swagger.config.js

import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'DeliveryOps API',
            version: '1.1.0',
            description:
                'API REST de DeliveryOps — Plataforma de gestión de entregas y operaciones logísticas. Incluye autenticación JWT con refresh token rotation, RBAC, ownership, uploads, máquina de estados, historial de cambios y sincronización entre pedidos y entregas.'
        },

        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor local'
            }
        ],

        tags: [
            {
                name: 'Auth',
                description: 'Autenticación y sesiones'
            },
            {
                name: 'Users',
                description: 'Usuarios y perfiles'
            },
            {
                name: 'Orders',
                description: 'Pedidos y flujo operativo'
            },
            {
                name: 'Deliveries',
                description: 'Entregas y seguimiento operativo'
            },
            {
                name: 'Uploads',
                description: 'Documentos y comprobantes'
            },
            {
                name: 'Health',
                description: 'Estado de la API'
            }
        ]
    },

    apis: ['./src/docs/**/*.yaml']
};

export const swaggerSpec =
    swaggerJSDoc(swaggerOptions);