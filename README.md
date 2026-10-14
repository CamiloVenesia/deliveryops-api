# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**

DeliveryOps es una API REST desarrollada con Node.js, Express y MongoDB para gestionar usuarios, pedidos, entregas, repartidores, documentos y operaciones logísticas.

---

## Estado actual

Actualmente incluye:

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
- Access Tokens
- Refresh Tokens
- Refresh Token Rotation
- Sesiones revocables
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

DeliveryOps utiliza la arquitectura:

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

Esto permite separar:

- rutas;
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

Se guarda en:

```text
deliveryops_refresh
```

como cookie:

```text
HttpOnly
```

El Refresh Token nunca se devuelve en el body de la respuesta.

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

Cada refresh:

```text
Refresh Token A
       ↓
POST /api/auth/refresh
       ↓
Token A revocado
       ↓
Refresh Token B
```

Si se reutiliza un token ya rotado:

```text
REFRESH_TOKEN_REUSED
```

las sesiones activas del usuario son revocadas.

---

# Endpoints de autenticación

## Login

```http
POST /api/auth/login
```

## Refresh

```http
POST /api/auth/refresh
```

## Logout

```http
POST /api/auth/logout
```

## Usuario autenticado

```http
GET /api/auth/me
```

Requiere:

```http
Authorization: Bearer ACCESS_TOKEN
```

---

# RBAC

DeliveryOps implementa:

```text
Role-Based Access Control
```

El sistema distingue actualmente:

```text
admin
customer
driver
store
```

`store` está definido en el modelo y queda reservado para la siguiente expansión funcional.

---

# Permisos actuales

## Admin

Puede:

- listar usuarios;
- consultar cualquier usuario;
- eliminar usuarios;
- cargar documentos de cualquier usuario;
- consultar todos los pedidos;
- crear pedidos para clientes;
- consultar cualquier pedido;
- cambiar estados de pedidos;
- eliminar pedidos;
- cargar comprobantes de pedidos;
- consultar todas las entregas;
- crear entregas;
- consultar cualquier entrega;
- cambiar estados de entregas;
- eliminar entregas;
- cargar comprobantes de entregas.

---

## Customer

Puede:

- registrarse;
- consultar su propio perfil;
- cargar documentos en su propio perfil;
- crear pedidos para sí mismo;
- listar únicamente sus pedidos;
- consultar únicamente sus pedidos;
- cargar comprobantes únicamente en sus pedidos;
- consultar entregas correspondientes a sus pedidos.

No puede:

- listar usuarios;
- consultar perfiles ajenos;
- crear pedidos para otra persona;
- cambiar estados administrativos;
- eliminar pedidos;
- crear entregas;
- eliminar entregas.

---

## Driver

Puede:

- consultar entregas asignadas a él;
- consultar una entrega si está asignada a él;
- actualizar el estado de sus propias entregas;
- cargar comprobantes de sus propias entregas.

No puede:

- acceder a entregas de otros drivers;
- crear entregas;
- eliminar entregas;
- modificar pedidos administrativos.

---

# Ownership

Además del rol, DeliveryOps verifica la propiedad del recurso.

Ejemplo:

```text
Customer A
   ↓
Pedido A
```

Customer A puede acceder a Pedido A.

Pero:

```text
Customer B
   ↓
Pedido A
   ↓
403 FORBIDDEN
```

Lo mismo ocurre con los drivers:

```text
Driver A
   ↓
Entrega A
```

Otro driver no puede consultar ni modificar esa entrega.

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

Actualmente Products todavía utiliza:

```text
Router → Service → Model
```

Pendiente de normalización a:

```text
Router → Controller → Service → Repository → Model
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

Los uploads protegidos utilizan JWT y permisos RBAC.

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

La documentación refleja actualmente los permisos RBAC de:

- Users
- Orders
- Deliveries
- Uploads
- Auth

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

Ejemplos:

```text
UNAUTHORIZED
FORBIDDEN
INVALID_CREDENTIALS
INVALID_ACCESS_TOKEN
INVALID_REFRESH_TOKEN
REFRESH_TOKEN_REUSED
USER_NOT_FOUND
ORDER_NOT_FOUND
DELIVERY_NOT_FOUND
```

---

# Seguridad implementada

Actualmente DeliveryOps cuenta con:

- bcrypt.
- Passwords excluidas de respuestas.
- `select: false` para password.
- JWT Access Tokens.
- Refresh Tokens.
- HttpOnly Cookies.
- Refresh Token Rotation.
- Detección de reutilización.
- Sesiones revocables.
- Hash de Refresh Tokens.
- `jti` único.
- Secrets independientes para Access y Refresh.
- Middleware de autenticación.
- RBAC.
- Ownership de recursos.
- Basic Auth para Swagger.
- Manejo centralizado de errores.
- Docker con usuario no-root.
- Tests de seguridad y permisos.

---

# Tests

La suite verifica, entre otras cosas:

- hashing de passwords;
- ocultamiento de passwords;
- login;
- credenciales incorrectas;
- Access Tokens;
- Refresh Tokens;
- Refresh Token Rotation;
- reutilización de Refresh Tokens;
- logout;
- autenticación obligatoria;
- RBAC;
- ownership de usuarios;
- ownership de pedidos;
- ownership de entregas;
- permisos de admin;
- permisos de customer;
- permisos de driver;
- uploads protegidos.

Estado actual:

```text
70 passing
```

---

# Roadmap

## Fase 1 — Seguridad

### Completado

- bcrypt.
- Passwords seguras.
- Login.
- JWT.
- Access Token.
- Refresh Token.
- Cookies HttpOnly.
- Persistencia de sesiones.
- Refresh Token Rotation.
- Detección de reutilización.
- Logout.
- Middleware de autenticación.
- RBAC.
- Ownership.
- Tests de permisos.

### Próximo

- Validación de requests con schemas.
- Helmet.
- CORS configurable.
- Rate limiting.
- Política de contraseñas.
- Seguridad de MongoDB.

---

## Fase 2 — Operaciones logísticas

- Máquina de estados.
- Historial de estados.
- Asignación avanzada de repartidores.
- Tracking.
- Costos.
- Filtros.
- Reportes.
- Proof of Delivery.
- Notificaciones.
- Email.
- Integración futura con WhatsApp.

---

## Fase 3 — Frontend

- Dashboard React.
- Panel administrativo.
- Panel de cliente.
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
- Postman.
- Monitoring.
- Gestión de secretos.
- Más cobertura de tests.

---

# Flujo general

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

# Estado del proyecto

```text
DeliveryOps API

70 tests passing

Authentication:
COMPLETED

JWT Sessions:
COMPLETED

Refresh Token Rotation:
COMPLETED

RBAC:
COMPLETED

Resource Ownership:
COMPLETED
```

Próxima etapa:

```text
Request Validation + API Hardening
```

---

# Autor

**Camilo Monti Venesia**

Full Stack Developer

GitHub:

```text
https://github.com/CamiloVenesia
```