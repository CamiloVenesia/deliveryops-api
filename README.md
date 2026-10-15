# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**

DeliveryOps es una plataforma full stack orientada a la administración de usuarios, pedidos, entregas, repartidores, documentos y operaciones logísticas.

El proyecto está compuesto por dos aplicaciones independientes:

```text
deliveryops-api
Backend REST API

deliveryops-web
Frontend React
```

---

# Estado actual

DeliveryOps incluye actualmente:

- gestión de usuarios;
- gestión de pedidos;
- gestión de entregas;
- gestión básica de productos;
- uploads de documentos;
- uploads de comprobantes;
- paginación;
- logging estructurado;
- manejo centralizado de errores;
- Swagger / OpenAPI;
- Docker;
- passwords con bcrypt;
- autenticación JWT;
- Access Tokens;
- Refresh Tokens;
- cookies HttpOnly;
- sesiones persistidas en MongoDB;
- Refresh Token Rotation;
- detección de reutilización de Refresh Tokens;
- logout y revocación de sesiones;
- RBAC;
- ownership;
- validación de requests con Zod;
- Helmet;
- CORS configurable;
- rate limiting;
- límites de payload;
- máquina de estados para pedidos;
- máquina de estados para entregas;
- historial de estados;
- registro del actor de cada cambio;
- sincronización de estados entre pedidos y entregas;
- cancelación de operaciones;
- eliminación segura de asignaciones;
- frontend React integrado;
- tests automatizados.

Estado de la suite:

```text
87 passing
```

---

# Tecnologías

## Backend

- Node.js 20+
- Express 4
- JavaScript ES Modules

## Base de datos

- MongoDB
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
- ownership

## Testing

- Mocha
- Chai
- Supertest
- cross-env

## Documentación

- Swagger
- swagger-jsdoc
- swagger-ui-express
- OpenAPI 3

## Logging

- Winston
- winston-daily-rotate-file

## Archivos

- Multer

## Infraestructura

- Docker
- Docker Compose

## Frontend

- React
- Vite
- React Router
- Axios
- TanStack Query
- Recharts
- Lucide React
- date-fns

---

# Arquitectura backend

DeliveryOps utiliza la siguiente arquitectura:

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
- controllers;
- reglas de negocio;
- acceso a datos;
- modelos;
- documentación.

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

Scripts administrativos:

```text
scripts/
└── create-admin.js
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

Producción:

```bash
npm start
```

Tests:

```bash
npm test
```

Estado actual:

```text
87 passing
```

---

# Crear administrador inicial

DeliveryOps incluye una herramienta administrativa para crear un usuario con rol `admin`.

Ejecutar:

```bash
npm run create:admin
```

El script solicita:

```text
Nombre
Apellido
Email
Password
```

La contraseña se almacena hasheada utilizando bcrypt.

El script no sobrescribe un usuario existente con el mismo email.

Esta herramienta está pensada para bootstrap administrativo y no expone una ruta HTTP pública para crear administradores.

---

# Docker

Validar configuración:

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

# Access Token

Duración configurada por defecto:

```text
15 minutos
```

Se envía mediante:

```http
Authorization: Bearer ACCESS_TOKEN
```

Incluye información como:

```text
sub
role
type
jti
iat
exp
```

---

# Refresh Token

Duración configurada por defecto:

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

El Refresh Token no se devuelve en el body.

---

# Sesiones

Cada login crea una sesión persistida en MongoDB.

La sesión contiene información como:

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

Se persiste:

```text
SHA-256(refreshToken)
```

---

# Refresh Token Rotation

Flujo:

```text
Refresh Token A
       ↓
POST /api/auth/refresh
       ↓
Token A revocado
       ↓
Refresh Token B
```

Si se reutiliza un Refresh Token ya revocado:

```text
REFRESH_TOKEN_REUSED
```

las sesiones relacionadas son revocadas.

---

# RBAC

DeliveryOps utiliza:

```text
Role-Based Access Control
```

Roles disponibles:

```text
admin
customer
driver
store
```

El rol `store` está preparado para una futura expansión funcional.

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
- modificar estados de pedidos;
- eliminar pedidos;
- consultar entregas;
- crear entregas;
- modificar entregas;
- eliminar entregas permitidas;
- cargar comprobantes;
- consultar historial operativo.

## Customer

Puede:

- registrarse;
- consultar su perfil;
- cargar sus documentos;
- crear pedidos para sí mismo;
- consultar sus pedidos;
- cargar comprobantes en sus pedidos;
- consultar entregas correspondientes a sus pedidos.

No puede modificar estados operativos.

## Driver

Puede:

- consultar sus entregas;
- modificar el estado de sus entregas asignadas;
- cargar comprobantes;
- consultar su información operativa.

No puede:

- modificar entregas de otros drivers;
- eliminar entregas;
- crear pedidos;
- crear entregas.

---

# Ownership

Además de RBAC, DeliveryOps verifica propiedad del recurso.

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

La misma regla se aplica a drivers y entregas.

---

# Máquina de estados de pedidos

Estados disponibles:

```text
created
assigned
picked_up
in_transit
delivered
cancelled
```

Transiciones válidas:

```text
created
├── assigned
└── cancelled

assigned
├── picked_up
├── in_transit
└── cancelled

picked_up
├── in_transit
└── cancelled

in_transit
├── delivered
└── cancelled
```

Estados terminales:

```text
delivered
cancelled
```

Una transición como:

```text
created → in_transit
```

es rechazada.

También se rechaza:

```text
assigned → delivered
```

porque la operación debe pasar primero por un estado operativo compatible.

---

# Máquina de estados de entregas

Estados disponibles:

```text
pending
assigned
in_transit
delivered
cancelled
```

Transiciones válidas:

```text
pending
├── assigned
└── cancelled

assigned
├── in_transit
└── cancelled

in_transit
├── delivered
└── cancelled
```

Estados terminales:

```text
delivered
cancelled
```

Ejemplo válido:

```text
assigned
    ↓
in_transit
    ↓
delivered
```

Ejemplo inválido:

```text
assigned
    ↓
delivered
```

---

# Historial de estados

Pedidos y entregas almacenan:

```text
statusHistory
```

Cada entrada contiene:

```text
from
to
changedBy
changedByRole
source
changedAt
```

Ejemplo conceptual:

```json
{
  "from": "assigned",
  "to": "in_transit",
  "changedBy": "665f4d0a8f9a1b001234abcd",
  "changedByRole": "driver",
  "source": "delivery",
  "changedAt": "2026-10-15T12:00:00.000Z"
}
```

Esto permite reconstruir quién realizó cada cambio y desde qué recurso se originó.

---

# Source del historial

`source` identifica qué recurso originó el cambio:

```text
order
delivery
system
```

Ejemplo:

```text
Driver actualiza entrega
        ↓
Delivery: assigned → in_transit
        ↓
Pedido sincronizado
        ↓
Order: assigned → in_transit
```

El historial del pedido indica:

```text
source: delivery
```

---

# Sincronización pedido ↔ entrega

DeliveryOps mantiene sincronizados los estados operativos compatibles.

Desde una entrega:

```text
Entrega assigned
    ↓
Pedido assigned
```

```text
Entrega in_transit
    ↓
Pedido in_transit
```

```text
Entrega delivered
    ↓
Pedido delivered
```

```text
Entrega cancelled
    ↓
Pedido cancelled
```

También existe sincronización desde el pedido hacia una entrega asociada para estados compatibles.

Antes de modificar ambos documentos se valida que las transiciones sean válidas.

---

# Asignación de entregas

Una entrega se crea asociando:

```text
Pedido
+
Driver
```

Cuando se crea correctamente:

```text
Delivery.status = assigned
Order.status = assigned
```

También se registra:

```text
assignedAt
```

y ambas entidades reciben entradas de historial.

Un pedido no puede tener más de una entrega activa asociada.

---

# Eliminación segura de entregas

Una entrega solamente puede eliminarse si está en:

```text
pending
assigned
```

No puede eliminarse cuando está:

```text
in_transit
delivered
cancelled
```

Si se elimina una entrega asignada:

```text
Delivery eliminada
        ↓
Order.delivery = null
        ↓
Order.status = created
```

El rollback también queda registrado en:

```text
statusHistory
```

con origen:

```text
delivery
```

---

# Cancelación

Pedidos y entregas soportan:

```text
cancelled
```

La cancelación es terminal.

Una vez cancelado un recurso no puede volver al flujo normal.

Cuando se cancela una entrega asociada, el pedido también pasa a:

```text
cancelled
```

---

# Validación de requests

DeliveryOps utiliza:

```text
Zod
```

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

Se validan, entre otros:

- login;
- creación de usuarios;
- emails;
- passwords;
- roles;
- ObjectIds;
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

Pueden configurarse múltiples orígenes separados por coma.

Ejemplo:

```env
CORS_ORIGINS=http://localhost:5173,https://app.deliveryops.com
```

La API utiliza:

```text
credentials: true
```

para permitir cookies HttpOnly desde frontends autorizados.

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

Las rutas de autenticación utilizan un límite más estricto.

Respuesta:

```json
{
  "status": "error",
  "error": "TOO_MANY_REQUESTS",
  "message": "Demasiadas solicitudes. Intentá nuevamente más tarde."
}
```

Durante testing se utiliza una configuración que evita interferencias con la suite automatizada.

---

# Payload limits

Los requests JSON y URL encoded tienen un límite de:

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

y queda pendiente su normalización completa con la arquitectura principal.

---

# Swagger

Disponible localmente en:

```text
http://localhost:3000/api/docs
```

Swagger está protegido mediante Basic Auth.

Credenciales configuradas mediante:

```env
BASIC_AUTH_USER
BASIC_AUTH_PASSWORD
```

Los endpoints protegidos de la API utilizan:

```text
BearerAuth
```

La documentación OpenAPI incluye:

- autenticación;
- usuarios;
- pedidos;
- entregas;
- uploads;
- estados;
- historial;
- sincronización;
- errores;
- permisos.

---

# Seguridad implementada

DeliveryOps cuenta actualmente con:

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

La suite verifica:

- usuarios;
- hashing;
- autenticación;
- login;
- refresh;
- logout;
- rotación de Refresh Tokens;
- reutilización de Refresh Tokens;
- RBAC;
- ownership;
- pedidos;
- entregas;
- uploads;
- mocks;
- logging;
- Swagger;
- rutas inexistentes;
- máquina de estados;
- transiciones válidas;
- transiciones inválidas;
- estados terminales;
- cancelación;
- historial de estados;
- actor de cambios;
- origen de cambios;
- sincronización pedido-entrega;
- eliminación segura de entregas;
- rollback de asignaciones.

Estado actual:

```text
87 passing
```

---

# Frontend

El frontend se encuentra en un repositorio independiente:

```text
deliveryops-web
```

Tecnologías:

```text
React
Vite
React Router
Axios
TanStack Query
Recharts
Lucide React
date-fns
```

Actualmente incluye:

- login;
- sesión persistente mediante refresh;
- rutas protegidas;
- RBAC visual;
- sidebar;
- dashboard;
- pedidos;
- entregas;
- usuarios;
- perfil;
- uploads;
- estados;
- responsive layout;
- lazy loading por rutas;
- code splitting.

El frontend consume:

```text
http://localhost:3000/api
```

durante desarrollo local.

---

# Estado del frontend

Validaciones actuales:

```text
npm run lint
0 errores
0 warnings
```

Build:

```text
npm run build
SUCCESS
```

Las páginas principales se compilan en chunks independientes mediante lazy loading.

---

# Roadmap

## Fase 1 — Backend base y seguridad

### Completado

- arquitectura backend;
- MongoDB;
- users;
- orders;
- deliveries;
- uploads;
- logging;
- Swagger;
- Docker;
- bcrypt;
- JWT;
- Refresh Tokens;
- sesiones;
- RBAC;
- ownership;
- Zod;
- Helmet;
- CORS;
- rate limiting;
- hardening de API.

---

## Fase 2 — Frontend base

### Completado

- React + Vite;
- login;
- layout principal;
- sidebar;
- dashboard;
- navegación;
- usuarios;
- pedidos;
- entregas;
- perfil;
- logout;
- integración JWT;
- refresh automático;
- diseño responsive;
- lazy loading;
- code splitting.

---

## Fase 3 — Operaciones logísticas avanzadas

### Completado

- máquina de estados;
- historial de estados;
- sincronización pedido-entrega;
- cancelación;
- actor de cambios;
- rollback seguro de asignaciones.

### Próximos bloques

- timeline visual de operaciones;
- detalle completo de pedido;
- detalle completo de entrega;
- asignación avanzada;
- tracking;
- costos;
- reportes;
- Proof of Delivery mejorado;
- notificaciones;
- email;
- WhatsApp;
- mapas;
- funcionalidades operativas para `store`.

---

## Fase 4 — Producción

Pendiente:

- CI/CD;
- deploy;
- versionado;
- seeds de producción/demo;
- colección Postman;
- monitoring;
- gestión de secretos;
- auditoría controlada de dependencias.

---

# Estado del proyecto

```text
DeliveryOps API

Tests:
87 PASSING

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

State Machine:
COMPLETED

Status History:
COMPLETED

Order ↔ Delivery Sync:
COMPLETED

DeliveryOps Web:
BASE COMPLETED
```

Próxima etapa:

```text
OPERATIONS UI

Timeline visual
+
Detalle completo de pedidos
+
Detalle completo de entregas
```

---

# Autor

**Camilo Monti Venesia**

Full Stack Developer

GitHub:

```text
https://github.com/CamiloVenesia
```