# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**

DeliveryOps es una API REST desarrollada con Node.js, Express y MongoDB para gestionar usuarios, pedidos, entregas, repartidores, documentos y operaciones logísticas.

---

# Estado actual

Actualmente DeliveryOps incluye:

- Gestión de usuarios.
- Gestión de pedidos.
- Gestión de entregas.
- Gestión básica de productos.
- Upload de documentos y comprobantes.
- Paginación.
- Logging estructurado.
- Manejo centralizado de errores.
- Swagger.
- Docker.
- Contraseñas con bcrypt.
- Autenticación JWT.
- Access Tokens.
- Refresh Tokens.
- Cookies HttpOnly.
- Sesiones persistidas en MongoDB.
- Refresh Token Rotation.
- Detección de reutilización de Refresh Tokens.
- Logout y revocación de sesiones.
- RBAC.
- Control de ownership.
- Validación de requests con Zod.
- Helmet.
- CORS configurable.
- Rate limiting.
- Límites de payload.
- Tests automatizados.

Estado actual:

```text
70 tests passing
```

---

# Tecnologías

## Backend

- Node.js 20+
- Express 4
- JavaScript ES Modules

## Base de datos

- MongoDB 7
- Mongoose 8

## Seguridad

- bcrypt
- JSON Web Tokens
- HttpOnly Cookies
- Zod
- Helmet
- express-rate-limit
- CORS configurable
- RBAC

## Testing

- Mocha
- Chai
- Supertest
- cross-env

## Documentación

- Swagger
- swagger-jsdoc
- swagger-ui-express

## Logging

- Winston
- winston-daily-rotate-file

## Archivos

- Multer

## Infraestructura

- Docker
- Docker Compose

---

# Arquitectura

DeliveryOps utiliza:

```text
Router
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Model
```

Esto permite separar:

- rutas;
- autenticación;
- autorización;
- validación;
- controladores;
- reglas de negocio;
- acceso a datos;
- modelos.

---

# Estructura principal

```text
src/
├── config/
├── constants/
├── controllers/
├── docs/
├── middleware/
├── models/
├── repositories/
├── routes/
├── services/
├── utils/
├── validators/
├── app.js
└── server.js
```

Tests:

```text
tests/
├── setup.js
├── auth.test.js
├── deliveries.test.js
├── docs.test.js
├── logger.test.js
├── mocks.test.js
├── orders.test.js
├── routes.test.js
├── uploads.test.js
└── users.test.js
```

---

# Instalación

```bash
git clone https://github.com/CamiloVenesia/deliveryops-api.git
cd deliveryops-api
npm install
```

---

# Variables de entorno

Crear:

```text
.env
```

basándose en:

```text
.env.example
```

Ejemplo:

```env
PORT=3000

MONGO_URL=mongodb://localhost:27017/deliveryops
MONGO_URL_TEST=mongodb://localhost:27017/deliveryops-test

NODE_ENV=development
LOG_LEVEL=debug

BASIC_AUTH_USER=dev
BASIC_AUTH_PASSWORD=change-this-password

JWT_ACCESS_SECRET=change-this-access-secret
JWT_REFRESH_SECRET=change-this-refresh-secret

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGINS=http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=30
```

Los secretos reales no deben almacenarse en Git.

---

# Ejecución

Desarrollo:

```bash
npm run dev
```

Testing:

```bash
npm test
```

Estado actual:

```text
70 passing
```

---

# Docker

Validar:

```bash
docker compose config
```

Levantar:

```bash
docker compose up --build
```

Detener:

```bash
docker compose down
```

Recursos principales:

```text
deliveryops-api
deliveryops-mongo
deliveryops-network
deliveryops-mongo-data
```

---

# Autenticación

DeliveryOps utiliza:

```text
Email + Password
       ↓
bcrypt.compare()
       ↓
Access Token
       +
Refresh Token
```

---

## Access Token

Duración:

```text
15 minutos
```

Se envía mediante:

```http
Authorization: Bearer ACCESS_TOKEN
```

Incluye:

```text
sub
role
type
jti
iat
exp
```

---

## Refresh Token

Duración:

```text
7 días
```

Se almacena en:

```text
deliveryops_refresh
```

como cookie:

```text
HttpOnly
```

El Refresh Token nunca se devuelve en el body.

---

# Sesiones

Cada login crea una sesión persistida en MongoDB.

```text
user
tokenHash
jti
expiresAt
revokedAt
replacedBySession
userAgent
ipAddress
```

El Refresh Token original no se almacena.

Se almacena:

```text
SHA-256(refreshToken)
```

---

# Refresh Token Rotation

```text
Refresh Token A
       ↓
POST /api/auth/refresh
       ↓
Token A revocado
       ↓
Refresh Token B
```

Si se reutiliza un token revocado:

```text
REFRESH_TOKEN_REUSED
```

las sesiones activas asociadas son revocadas.

---

# RBAC

DeliveryOps implementa:

```text
Role-Based Access Control
```

Roles:

```text
admin
customer
driver
store
```

`store` está preparado para una expansión funcional posterior.

---

# Permisos

## Admin

Puede:

- listar usuarios;
- consultar usuarios;
- eliminar usuarios;
- gestionar documentos;
- consultar pedidos;
- crear pedidos;
- modificar pedidos;
- eliminar pedidos;
- consultar entregas;
- crear entregas;
- modificar entregas;
- eliminar entregas;
- cargar comprobantes.

---

## Customer

Puede:

- registrarse;
- consultar su perfil;
- cargar sus documentos;
- crear pedidos para sí mismo;
- consultar sus pedidos;
- cargar comprobantes en sus pedidos;
- consultar entregas asociadas a sus pedidos.

---

## Driver

Puede:

- consultar sus entregas;
- actualizar sus entregas;
- cargar comprobantes de sus entregas.

No puede acceder a entregas asignadas a otros drivers.

---

# Ownership

DeliveryOps también verifica propiedad del recurso.

Ejemplo:

```text
Customer A
    ↓
Pedido A
```

Customer A puede acceder.

Pero:

```text
Customer B
    ↓
Pedido A
    ↓
403 FORBIDDEN
```

El mismo principio se aplica a drivers y entregas.

---

# Validación de requests

DeliveryOps utiliza:

```text
Zod
```

Las validaciones se ejecutan antes de llegar al controller.

Flujo:

```text
Request
   ↓
Zod Schema
   ↓
Middleware validate
   ↓
Controller
```

Actualmente se validan:

- login;
- creación de usuarios;
- emails;
- passwords;
- roles;
- IDs MongoDB;
- creación de pedidos;
- items;
- cantidades;
- precios;
- direcciones;
- prioridades;
- estados de pedidos;
- creación de entregas;
- estados de entregas.

Los errores utilizan el formato estándar:

```json
{
  "status": "error",
  "error": "VALIDATION_ERROR",
  "message": "Descripción del error"
}
```

---

# Helmet

DeliveryOps utiliza Helmet para agregar headers HTTP de seguridad.

Ejemplos:

```text
X-Content-Type-Options
Cross-Origin-Resource-Policy
Content-Security-Policy
Strict-Transport-Security
```

Express también tiene deshabilitado:

```text
X-Powered-By
```

---

# CORS

Los orígenes permitidos se controlan mediante:

```env
CORS_ORIGINS=http://localhost:5173
```

Se pueden configurar múltiples orígenes separados por coma.

Ejemplo:

```env
CORS_ORIGINS=http://localhost:5173,https://app.deliveryops.com
```

La API utiliza:

```text
credentials: true
```

para permitir cookies HttpOnly desde el frontend autorizado.

---

# Rate limiting

DeliveryOps protege la API contra abuso mediante:

```text
express-rate-limit
```

Configuración general:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

Autenticación:

```env
AUTH_RATE_LIMIT_MAX=30
```

Las rutas de autenticación tienen un límite más estricto.

Respuesta:

```json
{
  "status": "error",
  "error": "TOO_MANY_REQUESTS",
  "message": "Demasiadas solicitudes. Intentá nuevamente más tarde."
}
```

Durante testing se utiliza un límite elevado para evitar interferencias con la suite automatizada.

---

# Payload limits

Los requests JSON y URL encoded tienen actualmente un límite de:

```text
1 MB
```

Esto reduce el riesgo de requests excesivamente grandes.

---

# Endpoints Auth

```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

---

# Users

```http
GET    /api/users
POST   /api/users
GET    /api/users/:uid
DELETE /api/users/:uid
```

Documentos:

```http
POST /api/users/:uid/documents
```

---

# Orders

```http
GET    /api/orders
POST   /api/orders
GET    /api/orders/:oid
PATCH  /api/orders/:oid/status
DELETE /api/orders/:oid
```

Comprobantes:

```http
POST /api/orders/:oid/receipt
```

---

# Deliveries

```http
GET    /api/deliveries
POST   /api/deliveries
GET    /api/deliveries/:did
PATCH  /api/deliveries/:did/status
DELETE /api/deliveries/:did
```

Comprobantes:

```http
POST /api/deliveries/:did/receipt
```

---

# Products

```http
GET    /api/products
GET    /api/products/:pid
POST   /api/products
PUT    /api/products/:pid
DELETE /api/products/:pid
```

Products todavía utiliza:

```text
Router → Service → Model
```

Pendiente de normalización.

---

# Swagger

Disponible en:

```text
http://localhost:3000/api/docs
```

Swagger está protegido mediante Basic Auth.

Los endpoints JWT utilizan:

```text
BearerAuth
```

---

# Seguridad implementada

Actualmente DeliveryOps cuenta con:

- bcrypt;
- passwords ocultas;
- JWT;
- Access Tokens;
- Refresh Tokens;
- HttpOnly Cookies;
- Refresh Token Rotation;
- detección de reutilización;
- sesiones revocables;
- hash de Refresh Tokens;
- RBAC;
- ownership;
- Zod;
- Helmet;
- CORS configurable;
- rate limiting;
- límite de payload;
- Basic Auth para Swagger;
- Docker non-root;
- manejo centralizado de errores.

---

# Testing

La suite actual verifica:

- usuarios;
- hashing;
- autenticación;
- refresh;
- logout;
- RBAC;
- ownership;
- pedidos;
- entregas;
- uploads;
- mocks;
- logging;
- Swagger;
- rutas inexistentes.

Estado:

```text
70 passing
```

---

# Roadmap

## Fase 1 — Backend base y seguridad

### Completado

- Arquitectura backend.
- MongoDB.
- Users.
- Orders.
- Deliveries.
- Uploads.
- Logging.
- Swagger.
- Docker.
- bcrypt.
- JWT.
- Refresh Tokens.
- Sesiones.
- RBAC.
- Ownership.
- Zod.
- Helmet.
- CORS.
- Rate limiting.

---

# Fase 2 — Frontend

## Próximo bloque

```text
DeliveryOps Web
React + Vite
```

Se desarrollará:

- login;
- layout principal;
- sidebar;
- dashboard;
- navegación;
- usuarios;
- pedidos;
- entregas;
- estados;
- perfil;
- logout;
- integración con JWT;
- refresh automático;
- diseño responsive.

---

# Fase 3 — Operaciones logísticas avanzadas

- Máquina de estados.
- Historial de estados.
- Asignación avanzada.
- Tracking.
- Costos.
- Reportes.
- Proof of Delivery.
- Notificaciones.
- Email.
- WhatsApp.
- Mapas.

---

# Fase 4 — Producción

- CI/CD.
- Deploy.
- Versionado.
- Seeds.
- Postman.
- Monitoring.
- Gestión de secretos.
- Auditoría de dependencias.

---

# Estado del proyecto

```text
DeliveryOps API

70 tests passing

Authentication:
COMPLETED

JWT Sessions:
COMPLETED

RBAC:
COMPLETED

Ownership:
COMPLETED

Request Validation:
COMPLETED

API Hardening:
COMPLETED
```

Próxima etapa:

```text
DELIVERYOPS WEB
React + Vite
```

---

# Autor

**Camilo Monti Venesia**

Full Stack Developer

GitHub:

```text
https://github.com/CamiloVenesia
```