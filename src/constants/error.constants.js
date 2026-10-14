// src/constants/error.constants.js

export const ERROR_CODES = {
    // Usuarios
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXIST: 'USER_ALREADY_EXIST',

    // Autenticación
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
    INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
    REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',

    // Pedidos
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
    ORDER_ALREADY_DELIVERED: 'ORDER_ALREADY_DELIVERED',

    // Entregas
    DELIVERY_NOT_FOUND: 'DELIVERY_NOT_FOUND',
    DRIVER_UNAVAILABLE: 'DRIVER_UNAVAILABLE',

    // Productos
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    INVALID_STOCK: 'INVALID_STOCK',

    // Mocks
    INVALID_MOCK_QUANTITY: 'INVALID_MOCK_QUANTITY',
    MOCK_GENERATION_FAILED: 'MOCK_GENERATION_FAILED',

    // Rutas
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

    // Genéricos
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

    // Archivos
    FILE_REQUIRED: 'FILE_REQUIRED',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_DOCUMENT_TYPE: 'INVALID_DOCUMENT_TYPE',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR'
};

Object.freeze(ERROR_CODES);

export const ERROR_DICTIONARY = {
    // Usuarios
    [ERROR_CODES.USER_NOT_FOUND]: {
        statusCode: 404,
        message: 'Usuario no encontrado'
    },

    [ERROR_CODES.USER_ALREADY_EXIST]: {
        statusCode: 400,
        message: 'El usuario ya existe'
    },

    // Autenticación
    [ERROR_CODES.INVALID_CREDENTIALS]: {
        statusCode: 401,
        message: 'Email o contraseña incorrectos'
    },

    [ERROR_CODES.UNAUTHORIZED]: {
        statusCode: 401,
        message: 'Autenticación requerida'
    },

    [ERROR_CODES.INVALID_ACCESS_TOKEN]: {
        statusCode: 401,
        message: 'Access token inválido o expirado'
    },

    [ERROR_CODES.INVALID_REFRESH_TOKEN]: {
        statusCode: 401,
        message: 'Refresh token inválido o expirado'
    },

    [ERROR_CODES.REFRESH_TOKEN_REUSED]: {
        statusCode: 401,
        message: 'Se detectó la reutilización de un refresh token'
    },

    // Pedidos
    [ERROR_CODES.ORDER_NOT_FOUND]: {
        statusCode: 404,
        message: 'Pedido no encontrado'
    },

    [ERROR_CODES.INVALID_ORDER_STATUS]: {
        statusCode: 400,
        message: 'El estado del pedido no es válido'
    },

    [ERROR_CODES.ORDER_ALREADY_DELIVERED]: {
        statusCode: 409,
        message: 'El pedido ya fue entregado y no puede modificarse'
    },

    // Entregas
    [ERROR_CODES.DELIVERY_NOT_FOUND]: {
        statusCode: 404,
        message: 'Entrega no encontrada'
    },

    [ERROR_CODES.DRIVER_UNAVAILABLE]: {
        statusCode: 409,
        message: 'No hay repartidores disponibles en este momento'
    },

    // Productos
    [ERROR_CODES.PRODUCT_NOT_FOUND]: {
        statusCode: 404,
        message: 'Producto no encontrado'
    },

    [ERROR_CODES.INVALID_STOCK]: {
        statusCode: 400,
        message: 'El stock o precio no puede ser negativo'
    },

    // Mocks
    [ERROR_CODES.INVALID_MOCK_QUANTITY]: {
        statusCode: 400,
        message: 'La cantidad debe ser un número entero mayor a cero'
    },

    [ERROR_CODES.MOCK_GENERATION_FAILED]: {
        statusCode: 500,
        message: 'Ocurrió un error al generar o insertar los datos de prueba'
    },

    // Rutas
    [ERROR_CODES.ROUTE_NOT_FOUND]: {
        statusCode: 404,
        message: 'La ruta solicitada no existe'
    },

    // Genéricos
    [ERROR_CODES.VALIDATION_ERROR]: {
        statusCode: 400,
        message: 'Faltan datos obligatorios'
    },

    [ERROR_CODES.FORBIDDEN]: {
        statusCode: 403,
        message: 'Acción no permitida'
    },

    [ERROR_CODES.DATABASE_ERROR]: {
        statusCode: 500,
        message: 'Error al interactuar con la base de datos'
    },

    [ERROR_CODES.INTERNAL_SERVER_ERROR]: {
        statusCode: 500,
        message: 'Error interno del servidor'
    },

    // Archivos
    [ERROR_CODES.FILE_REQUIRED]: {
        statusCode: 400,
        message: 'Se requiere un archivo para esta operación'
    },

    [ERROR_CODES.INVALID_FILE_TYPE]: {
        statusCode: 400,
        message: 'El tipo de archivo no está permitido'
    },

    [ERROR_CODES.FILE_TOO_LARGE]: {
        statusCode: 400,
        message: 'El archivo supera el tamaño máximo permitido'
    },

    [ERROR_CODES.INVALID_DOCUMENT_TYPE]: {
        statusCode: 400,
        message: 'El tipo de documento indicado no es válido'
    },

    [ERROR_CODES.FILE_UPLOAD_ERROR]: {
        statusCode: 500,
        message: 'Ocurrió un error al guardar el archivo'
    }
};