
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'DeliveryOps API',
      version: '1.2.0',
      description:
        'DeliveryOps — Plataforma de gestión de entregas y operaciones logísticas. API REST con autenticación JWT, refresh token rotation, RBAC, ownership, gestión de depósitos, pedidos, destinatarios, entregas, máquina de estados, tracking GPS, Proof of Delivery y operaciones logísticas.'
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
        name: 'Depots',
        description: 'Depósitos y centros de distribución'
      },
      {
        name: 'Logistics',
        description: 'Destinatarios, direcciones y operaciones logísticas'
      },
      {
        name: 'Tracking',
        description: 'Ubicaciones GPS, intentos y comprobantes de entrega'
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

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
