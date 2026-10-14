# DeliveryOps

**Plataforma de gestión de entregas y operaciones logísticas**

DeliveryOps es una API REST desarrollada con Node.js, Express y MongoDB para centralizar la gestión de usuarios, pedidos, entregas, repartidores, documentos y operaciones asociadas a un flujo logístico.

El proyecto está evolucionando hacia una plataforma completa de operaciones de última milla, incorporando progresivamente autenticación, autorización por roles, tracking, asignación de repartidores, reportes, notificaciones y un dashboard administrativo.

---

## Estado actual

Actualmente la API permite:

- Gestión de usuarios.
- Gestión de pedidos.
- Gestión de entregas.
- Gestión básica de productos.
- Actualización de estados.
- Asociación de repartidores.
- Carga de documentos.
- Carga de comprobantes de pedidos y entregas.
- Generación de datos simulados.
- Paginación.
- Manejo centralizado de errores.
- Logging estructurado.
- Documentación interactiva con Swagger.
- Testing funcional automatizado.
- Ejecución local o mediante Docker.

La suite actual cuenta con:

```text
35 tests funcionales
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

La arquitectura principal del proyecto sigue el flujo:

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

Define endpoints y delega las solicitudes HTTP.

## Controller

Gestiona `req` y `res`, invoca al service correspondiente y construye la respuesta HTTP.

## Service

Contiene reglas de negocio, validaciones y coordinación entre las distintas partes del dominio.

## Repository

Centraliza el acceso a MongoDB mediante Mongoose.

## Model

Define los schemas y entidades persistidas.

Los dominios principales de usuarios, pedidos y entregas siguen esta separación por capas.

Actualmente el módulo de productos conserva una implementación más simple:

```text
Router → Service → Model
```

Está previsto migrarlo al mismo patrón arquitectónico que el resto de la aplicación.

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
│   ├── delivery.controller.js
│   ├── mocks.controller.js
│   ├── order.controller.js
│   └── user.controller.js
│
├── docs/
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
│   ├── basicAuth.js
│   ├── errorHandler.js
│   └── handleUpload.js
│
├── models/
│   ├── delivery.model.js
│   ├── order.model.js
│   ├── product.model.js
│   └── user.model.js
│
├── repositories/
│   ├── delivery.repository.js
│   ├── mocks.repository.js
│   ├── order.repository.js
│   └── user.repository.js
│
├── routes/
│   ├── deliveries.routes.js
│   ├── health.routes.js
│   ├── logger.routes.js
│   ├── mocks.routes.js
│   ├── orders.routes.js
│   ├── products.routes.js
│   └── users.routes.js
│
├── services/
│   ├── delivery.service.js
│   ├── mocks.service.js
│   ├── order.service.js
│   ├── product.service.js
│   └── user.service.js
│
├── utils/
│   ├── asyncHandler.js
│   ├── customError.js
│   └── logger.js
│
├── app.js
└── server.js
```

Los tests se encuentran separados de la aplicación:

```text
tests/
├── setup.js
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

Instalá las dependencias:

```bash
npm install
```

---

# Variables de entorno

Creá un archivo `.env` tomando como referencia:

```text
.env.example
```

Configuración local actual:

```env
PORT=3000

MONGO_URL=mongodb://localhost:27017/deliveryops
MONGO_URL_TEST=mongodb://localhost:27017/deliveryops-test

NODE_ENV=development
LOG_LEVEL=debug

BASIC_AUTH_USER=dev
BASIC_AUTH_PASSWORD=deliveryops123
```

La contraseña mostrada es únicamente para desarrollo local.

No debe utilizarse como secreto en producción.

---

## Variables disponibles

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto HTTP de la API |
| `MONGO_URL` | Conexión principal a MongoDB |
| `MONGO_URL_TEST` | Base de datos exclusiva para tests |
| `NODE_ENV` | Entorno de ejecución |
| `LOG_LEVEL` | Nivel de logging |
| `BASIC_AUTH_USER` | Usuario para Swagger y endpoints internos |
| `BASIC_AUTH_PASSWORD` | Contraseña para Swagger y endpoints internos |

Las variables críticas son verificadas al iniciar la aplicación.

Si falta alguna, el servidor no arranca.

Ejemplo:

```text
[FATAL] Faltan variables de entorno obligatorias: MONGO_URL
Revisá tu archivo .env (podés basarte en .env.example)
```

---

# Ejecución local

Asegurate de tener MongoDB funcionando.

En Windows podés comprobarlo con:

```powershell
Get-Service MongoDB
```

Si el servicio está detenido:

```powershell
Start-Service MongoDB
```

Luego iniciá el servidor en modo desarrollo:

```bash
npm run dev
```

Salida esperada:

```text
Conexión a MongoDB establecida
Servidor DeliveryOps escuchando en el puerto 3000 (entorno: development)
```

La API queda disponible en:

```text
http://localhost:3000
```

Para ejecución normal:

```bash
npm start
```

---

# Docker

DeliveryOps puede ejecutarse completamente mediante Docker Compose.

## Validar configuración

```bash
docker compose config
```

## Levantar la aplicación

```bash
docker compose up --build
```

Esto crea los siguientes recursos:

```text
deliveryops-api
deliveryops-mongo
deliveryops-network
deliveryops-mongo-data
```

La API queda disponible en:

```text
http://localhost:3000
```

MongoDB queda disponible desde el host en:

```text
mongodb://localhost:27017
```

Dentro de Docker, la API se conecta mediante:

```text
mongodb://mongo:27017/deliveryops
```

---

## Detener los contenedores

```bash
docker compose down
```

Para eliminar también el volumen de MongoDB:

```bash
docker compose down -v
```

---

# Testing

Ejecutar:

```bash
npm test
```

El comando utilizado actualmente es:

```bash
cross-env NODE_ENV=test mocha --exit tests/setup.js tests/**/*.test.js
```

La suite utiliza una base independiente:

```text
deliveryops-test
```

Antes de cada test se limpian las colecciones correspondientes para mantener aislamiento entre casos.

Estado actual:

```text
35 passing
```

---

# Cobertura funcional actual

Los tests verifican:

- Creación de usuarios.
- Consulta de usuarios.
- Paginación.
- Validaciones de datos.
- Restricciones por roles existentes.
- Creación de pedidos.
- Cálculo de totales.
- Actualización de estados.
- Pedidos ya entregados.
- Clientes inexistentes.
- Generación de mocks.
- Persistencia de datos simulados.
- Documentos de usuarios.
- Comprobantes de pedidos.
- Comprobantes de entregas.
- Validación de tipos de archivo.
- Archivos faltantes.
- Entidades inexistentes.
- Logger.
- Swagger protegido.
- Manejo de rutas inexistentes.

---

# Documentación Swagger

Con la aplicación funcionando:

```text
http://localhost:3000/api/docs
```

Swagger está protegido mediante Basic Auth.

Las credenciales se obtienen de:

```text
BASIC_AUTH_USER
BASIC_AUTH_PASSWORD
```

---

## Uso de Swagger

Después de ingresar las credenciales:

1. Abrí un endpoint.
2. Presioná `Try it out`.
3. Completá los parámetros o el body.
4. Presioná `Execute`.
5. Revisá el status code y la respuesta.

---

# Endpoints principales

## Health

```http
GET /api/health
```

---

## Users

```http
GET    /api/users
POST   /api/users
GET    /api/users/:uid
DELETE /api/users/:uid
```

Carga de documentos:

```http
POST /api/users/:uid/documents
```

---

## Orders

```http
GET    /api/orders
POST   /api/orders
GET    /api/orders/:oid
PATCH  /api/orders/:oid/status
DELETE /api/orders/:oid
```

Carga de comprobante:

```http
POST /api/orders/:oid/receipt
```

---

## Deliveries

```http
GET    /api/deliveries
POST   /api/deliveries
GET    /api/deliveries/:did
PATCH  /api/deliveries/:did/status
DELETE /api/deliveries/:did
```

Carga de comprobante:

```http
POST /api/deliveries/:did/receipt
```

---

## Products

```http
GET    /api/products
GET    /api/products/:pid
POST   /api/products
PUT    /api/products/:pid
DELETE /api/products/:pid
```

---

## Mocks

```http
GET  /api/mocks/mockingusers
GET  /api/mocks/mockingorders
GET  /api/mocks/mockingdeliveries
POST /api/mocks/generateData
```

En producción los endpoints internos de mocks están protegidos mediante Basic Auth.

---

## Logger

```http
GET /api/loggerTest
```

Endpoint de diagnóstico para comprobar los niveles configurados en Winston.

En producción también está protegido mediante Basic Auth.

---

# Paginación

Los endpoints principales admiten:

```text
?page=1&limit=10
```

El límite máximo permitido actualmente es:

```text
50
```

---

# Manejo de errores

DeliveryOps utiliza un sistema centralizado mediante:

```text
customError
ERROR_CODES
errorHandler
asyncHandler
```

La estructura estándar es:

```json
{
  "status": "error",
  "error": "ERROR_CODE",
  "message": "Descripción del error"
}
```

Ejemplo:

```json
{
  "status": "error",
  "error": "ORDER_NOT_FOUND",
  "message": "Pedido no encontrado"
}
```

Esto permite mantener respuestas consistentes independientemente del endpoint que produzca el error.

---

# Logging

El sistema utiliza Winston con los niveles:

```text
fatal
error
warning
info
http
debug
```

En desarrollo los logs se muestran por consola.

En producción se almacenan mediante archivos con rotación diaria.

Archivos generados:

```text
logs/combined-FECHA.log
logs/error-FECHA.log
```

La retención configurada es de 14 días.

La carpeta `logs/` no se versiona.

---

# Uploads

Los archivos son administrados mediante Multer.

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

Los archivos se almacenan en:

```text
uploads/
```

MongoDB almacena únicamente los metadatos asociados.

Entre ellos:

```text
originalName
generatedName
path
mimetype
size
uploadedAt
```

Para documentos de usuarios también se almacena:

```text
documentType
```

---

# Seguridad actual

Actualmente DeliveryOps cuenta con:

- Validación de variables de entorno.
- Manejo centralizado de errores.
- Ejecución Docker mediante usuario no-root.
- Basic Auth para Swagger.
- Protección de endpoints internos en producción.
- Separación entre base de desarrollo y testing.
- Restricciones básicas de tipos y tamaño de archivos.

La siguiente etapa del proyecto incorporará una capa completa de seguridad de aplicación.

---

# Roadmap

## Fase 1 — Seguridad y autenticación

- Hash de contraseñas con bcrypt.
- Eliminación de passwords de las respuestas.
- Login.
- JWT Access Token.
- Refresh Tokens.
- Autorización basada en roles.
- Validación estructurada de requests.
- Helmet.
- CORS configurable.
- Rate limiting.
- Protección de secretos.
- Autenticación de MongoDB en Docker.

---

## Fase 2 — Operaciones logísticas

- Máquina de estados para pedidos y entregas.
- Asignación de repartidores.
- Tracking de entregas.
- Historial de estados.
- Costos logísticos.
- Filtros avanzados.
- Reportes.
- Proof of Delivery.
- Notificaciones.
- Integración de correo electrónico.
- Integración futura con WhatsApp.

---

## Fase 3 — Aplicaciones cliente

- Dashboard administrativo en React.
- Panel de repartidor.
- Gestión visual de pedidos.
- Gestión visual de entregas.
- Seguimiento público de entregas.
- Métricas operativas.

---

## Fase 4 — Producción

- CI/CD.
- Deploy.
- Seeds.
- Versionado de API.
- Mayor cobertura de testing.
- Colección de Postman.
- Monitoring.
- Gestión segura de secretos.

---

## Fase 5 — Producto y portfolio

- Caso de estudio técnico.
- Documentación de arquitectura.
- Diagramas del sistema.
- Demo pública.
- Capturas del dashboard.
- Descripción de decisiones técnicas.
- Presentación profesional dentro del portfolio.

---

# Objetivo del proyecto

DeliveryOps busca evolucionar desde una API REST funcional hacia una plataforma integral para la administración de operaciones de entrega.

El objetivo final es centralizar en una misma solución:

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

La plataforma estará orientada principalmente a operaciones de última milla, comercios, pequeñas empresas y equipos logísticos que necesiten centralizar pedidos, repartidores y entregas.

---

# Próximas mejoras técnicas

Entre las mejoras prioritarias se encuentran:

- Migrar Products a la arquitectura completa.
- Incorporar hashing seguro de passwords.
- Implementar autenticación JWT.
- Incorporar Refresh Tokens.
- Implementar permisos basados en roles.
- Validar requests mediante schemas.
- Incorporar middleware de seguridad.
- Mejorar la estrategia de rate limiting.
- Implementar autenticación de MongoDB.
- Mejorar almacenamiento de archivos.
- Incrementar cobertura de tests.
- Incorporar testing específico de seguridad.

---

# Convenciones del proyecto

La aplicación intenta mantener una separación clara entre:

```text
HTTP
↓
Controller
↓
Business Logic
↓
Repository
↓
Persistence
```

Los errores de negocio no se construyen directamente dentro de las rutas.

La lógica relacionada con MongoDB debe concentrarse progresivamente en repositories.

Los controllers deben mantenerse livianos.

Los services concentran reglas de negocio.

Las respuestas de error deben mantener el formato estándar definido por el proyecto.

---

# Archivos ignorados

El repositorio no versiona:

```text
node_modules/
.env
logs/
uploads/
coverage/
```

Los archivos sensibles y generados durante la ejecución permanecen fuera de Git.

---

# Estado del proyecto

DeliveryOps se encuentra actualmente en desarrollo activo.

La base funcional inicial está estable y cuenta con:

```text
35 tests pasando
```

La próxima etapa corresponde a la implementación de seguridad y autenticación.

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