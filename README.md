# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**

DeliveryOps es una API REST desarrollada con Node.js, Express y MongoDB para centralizar la gestión de usuarios, pedidos, entregas, repartidores, documentos y operaciones logísticas.

El proyecto evoluciona hacia una plataforma completa de operaciones de última milla, incorporando autenticación segura, gestión de sesiones, tracking, asignación de repartidores, reportes, notificaciones y un futuro dashboard administrativo.

---

# Estado actual

Actualmente DeliveryOps cuenta con:

- Gestión de usuarios.
- Gestión de pedidos.
- Gestión de entregas.
- Gestión básica de productos.
- Actualización de estados.
- Asociación de repartidores.
- Carga de documentos.
- Carga de comprobantes.
- Generación de datos simulados.
- Paginación.
- Manejo centralizado de errores.
- Logging estructurado.
- Documentación Swagger.
- Contraseñas hasheadas con bcrypt.
- Login con JWT.
- Access Tokens.
- Refresh Tokens.
- Refresh Token mediante cookie HttpOnly.
- Persistencia de sesiones en MongoDB.
- Hash del Refresh Token almacenado en base de datos.
- Rotación de Refresh Tokens.
- Detección de reutilización de Refresh Tokens.
- Revocación de sesiones mediante logout.
- Endpoint de usuario autenticado.
- Testing funcional automatizado.
- Docker y Docker Compose.

La suite actual cuenta con:

```text
47 tests pasando
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
- Access Tokens
- Refresh Tokens
- Cookies HttpOnly
- Sesiones revocables

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

## Desarrollo

- dotenv
- Nodemon
- Faker

## Infraestructura

- Docker
- Docker Compose
- Imagen multi-stage
- Ejecución con usuario no-root

---

# Arquitectura

La arquitectura principal sigue el flujo:

```text
Router
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Model
```

Cada capa tiene una responsabilidad definida.

## Router

Define endpoints y aplica middleware.

## Controller

Gestiona `req` y `res` y delega la lógica al service.

## Service

Contiene las reglas de negocio.

## Repository

Centraliza el acceso a MongoDB mediante Mongoose.

## Model

Define los schemas y entidades persistidas.

---

# Arquitectura de autenticación

El módulo de autenticación mantiene la misma separación:

```text
auth.routes.js
      ↓
auth.controller.js
      ↓
auth.service.js
      ↓
auth.repository.js
      ↓
auth-session.model.js
```

La validación de Access Tokens se realiza mediante:

```text
authenticate.js
```

La generación y verificación de JWT se concentra en:

```text
token.js
```

---

# Estructura del proyecto

```text
src/
├── config/
│   ├── env.js
│   └── multer.config.js
│
├── constants/
│   └── error.constants.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── delivery.controller.js
│   ├── mocks.controller.js
│   ├── order.controller.js
│   └── user.controller.js
│
├── docs/
│   ├── auth.yaml
│   ├── deliveries.yaml
│   ├── health.yaml
│   ├── logger.yaml
│   ├── mocks.yaml
│   ├── orders.yaml
│   ├── schemas.yaml
│   ├── uploads.yaml
│   ├── users.yaml
│   └── swagger.config.js
│
├── middleware/
│   ├── authenticate.js
│   ├── basicAuth.js
│   ├── errorHandler.js
│   └── handleUpload.js
│
├── models/
│   ├── auth-session.model.js
│   ├── delivery.model.js
│   ├── order.model.js
│   ├── product.model.js
│   └── user.model.js
│
├── repositories/
│   ├── auth.repository.js
│   ├── delivery.repository.js
│   ├── mocks.repository.js
│   ├── order.repository.js
│   └── user.repository.js
│
├── routes/
│   ├── auth.routes.js
│   ├── deliveries.routes.js
│   ├── health.routes.js
│   ├── logger.routes.js
│   ├── mocks.routes.js
│   ├── orders.routes.js
│   ├── products.routes.js
│   └── users.routes.js
│
├── services/
│   ├── auth.service.js
│   ├── delivery.service.js
│   ├── mocks.service.js
│   ├── order.service.js
│   ├── product.service.js
│   └── user.service.js
│
├── utils/
│   ├── asyncHandler.js
│   ├── customError.js
│   ├── logger.js
│   └── token.js
│
├── app.js
└── server.js
```

Tests:

```text
tests/
├── setup.js
├── auth.test.js
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

Cloná el repositorio:

```bash
git clone https://github.com/CamiloVenesia/deliveryops-api.git
```

Entrá al proyecto:

```bash
cd deliveryops-api
```

Instalá dependencias:

```bash
npm install
```

---

# Variables de entorno

Creá:

```text
.env
```

tomando como referencia:

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
```

Los secretos reales nunca deben versionarse.

---

# Variables obligatorias

```text
PORT
MONGO_URL
NODE_ENV
BASIC_AUTH_USER
BASIC_AUTH_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
```

`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` deben ser diferentes.

---

# Ejecución local

Comprobar MongoDB en Windows:

```powershell
Get-Service MongoDB
```

Iniciar desarrollo:

```bash
npm run dev
```

La API queda disponible en:

```text
http://localhost:3000
```

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

Recursos principales:

```text
deliveryops-api
deliveryops-mongo
deliveryops-network
deliveryops-mongo-data
```

Detener:

```bash
docker compose down
```

Eliminar también datos:

```bash
docker compose down -v
```

---

# Testing

Ejecutar:

```bash
npm test
```

Estado actual:

```text
47 passing
```

La suite utiliza:

```text
deliveryops-test
```

como base de datos independiente.

---

# Autenticación

DeliveryOps implementa autenticación mediante:

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

El Access Token es un JWT de corta duración.

Actualmente:

```text
15 minutos
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

Se envía mediante:

```http
Authorization: Bearer ACCESS_TOKEN
```

---

## Refresh Token

El Refresh Token tiene una duración actual de:

```text
7 días
```

Se entrega mediante una cookie:

```text
deliveryops_refresh
```

con:

```text
HttpOnly
```

y configuración adaptada según el entorno.

El Refresh Token no se devuelve en el body de las respuestas.

---

# Persistencia de sesiones

Cada login crea una sesión en MongoDB.

La sesión contiene:

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

El flujo es:

```text
Refresh Token
      ↓
SHA-256
      ↓
tokenHash
      ↓
MongoDB
```

---

# Rotación de Refresh Tokens

Cada vez que se utiliza:

```http
POST /api/auth/refresh
```

el Refresh Token anterior es revocado y se crea uno nuevo.

```text
Refresh Token A
      ↓
Refresh
      ↓
Token A revocado
      ↓
Refresh Token B
```

Esto reduce el impacto de robo de tokens.

---

# Detección de reutilización

Si se intenta reutilizar un Refresh Token que ya fue rotado:

```text
REFRESH_TOKEN_REUSED
```

DeliveryOps revoca las sesiones activas asociadas al usuario.

---

# Logout

```http
POST /api/auth/logout
```

El logout:

- revoca la sesión actual;
- invalida el Refresh Token asociado;
- elimina la cookie de autenticación.

---

# Usuario autenticado

```http
GET /api/auth/me
```

Requiere:

```http
Authorization: Bearer ACCESS_TOKEN
```

Devuelve los datos públicos del usuario autenticado.

Nunca devuelve:

```text
password
```

---

# Endpoints de autenticación

## Login

```http
POST /api/auth/login
```

Body:

```json
{
  "email": "usuario@deliveryops.com",
  "password": "PasswordSeguro123"
}
```

Respuesta:

```json
{
  "user": {
    "_id": "USER_ID",
    "firstName": "Usuario",
    "lastName": "DeliveryOps",
    "email": "usuario@deliveryops.com",
    "role": "customer"
  },
  "accessToken": "JWT"
}
```

---

## Refresh

```http
POST /api/auth/refresh
```

Utiliza automáticamente la cookie HttpOnly.

Respuesta:

```json
{
  "accessToken": "NEW_JWT"
}
```

---

## Logout

```http
POST /api/auth/logout
```

---

## Usuario actual

```http
GET /api/auth/me
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

Comprobante:

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

Comprobante:

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

Actualmente Products todavía utiliza:

```text
Router → Service → Model
```

Será migrado posteriormente a:

```text
Router → Controller → Service → Repository → Model
```

---

# Mocks

```http
GET  /api/mocks/mockingusers
GET  /api/mocks/mockingorders
GET  /api/mocks/mockingdeliveries
POST /api/mocks/generateData
```

Las passwords generadas se hashean antes de persistirse.

Nunca se incluyen en respuestas públicas.

---

# Swagger

Disponible en:

```text
http://localhost:3000/api/docs
```

Swagger está protegido mediante Basic Auth.

La documentación incluye:

- Users
- Orders
- Deliveries
- Uploads
- Mocks
- Health
- Logger
- Auth

Swagger también declara:

```text
BearerAuth
```

para endpoints protegidos con JWT.

---

# Contraseñas

Las contraseñas utilizan:

```text
bcrypt
```

Flujo:

```text
Password
   ↓
bcrypt.hash()
   ↓
Hash
   ↓
MongoDB
```

El modelo utiliza:

```text
select: false
```

y elimina `password` también durante:

```text
toJSON
toObject
```

---

# Manejo de errores

Formato estándar:

```json
{
  "status": "error",
  "error": "ERROR_CODE",
  "message": "Descripción del error"
}
```

Errores de autenticación actuales:

```text
INVALID_CREDENTIALS
UNAUTHORIZED
INVALID_ACCESS_TOKEN
INVALID_REFRESH_TOKEN
REFRESH_TOKEN_REUSED
```

---

# Logging

Niveles:

```text
fatal
error
warning
info
http
debug
```

Producción:

```text
logs/combined-FECHA.log
logs/error-FECHA.log
```

---

# Uploads

Formatos permitidos:

```text
JPG
PNG
PDF
```

Tamaño máximo:

```text
5 MB
```

Archivos locales:

```text
uploads/
```

---

# Seguridad implementada

Actualmente DeliveryOps incluye:

- bcrypt para passwords.
- Passwords excluidas de respuestas.
- JWT Access Tokens.
- Refresh Tokens.
- Cookies HttpOnly.
- Refresh Token rotation.
- Detección de reutilización.
- Sesiones revocables.
- Hash de Refresh Tokens en MongoDB.
- `jti` único por token.
- Separación de secrets para Access y Refresh.
- Middleware Bearer Authentication.
- Basic Auth para Swagger.
- Manejo centralizado de errores.
- Docker con usuario no-root.
- Tests específicos de autenticación.

---

# Seguridad pendiente

Próximamente:

- RBAC completo.
- Validación con schemas.
- Helmet.
- CORS configurable.
- Rate limiting.
- MongoDB con autenticación.
- Gestión avanzada de sesiones.
- Protección adicional contra abuso.
- Políticas de password.

---

# Roadmap

## Fase 1 — Seguridad y autenticación

### Completado

- bcrypt.
- Passwords ocultas.
- Login.
- JWT Access Token.
- Refresh Token.
- Cookie HttpOnly.
- Sesiones persistidas.
- Token rotation.
- Detección de reutilización.
- Logout.
- Endpoint `/me`.

### Próximo

- RBAC.
- Validación de requests.
- Helmet.
- CORS configurable.
- Rate limiting.
- Seguridad de MongoDB.

---

## Fase 2 — Operaciones logísticas

- Máquina de estados.
- Asignación de repartidores.
- Tracking.
- Historial de estados.
- Costos.
- Filtros avanzados.
- Reportes.
- Proof of Delivery.
- Notificaciones.
- Email.
- Integración futura con WhatsApp.

---

## Fase 3 — Frontend

- Dashboard React.
- Panel administrativo.
- Panel de repartidor.
- Gestión de pedidos.
- Gestión de entregas.
- Tracking público.
- Métricas.

---

## Fase 4 — Producción

- CI/CD.
- Deploy.
- Versionado de API.
- Seeds.
- Más testing.
- Postman.
- Monitoring.
- Gestión de secretos.

---

## Fase 5 — Portfolio

- Caso de estudio.
- Diagramas.
- Demo.
- Capturas.
- Arquitectura documentada.
- Presentación profesional.

---

# Objetivo

DeliveryOps busca centralizar:

```text
Cliente
   ↓
Pedido
   ↓
Preparación
   ↓
Asignación
   ↓
Repartidor
   ↓
Entrega
   ↓
Comprobante
   ↓
Tracking
   ↓
Reportes
```

---

# Estado actual

```text
DeliveryOps API
47 tests passing
JWT Authentication implemented
Refresh Token Rotation implemented
```

La próxima etapa corresponde a:

```text
RBAC — Role Based Access Control
```

---

# Autor

**Camilo Monti Venesia**

Full Stack Developer

GitHub:

```text
https://github.com/CamiloVenesia
```

---

# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**