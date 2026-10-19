
import { Router } from 'express';
import multer from 'multer';

import {
  deliveryController
} from '../controllers/delivery.controller.js';

import {
  deliveryLogisticsController
} from '../controllers/delivery-logistics.controller.js';

import {
  deliveryAttemptsController
} from '../controllers/delivery-attempts.controller.js';

import {
  deliveryReceiptController
} from '../controllers/delivery-receipt.controller.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { handleUpload } from '../middleware/handleUpload.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

import {
  validateBody,
  validateParams
} from '../middleware/validate.js';

import {
  createDeliverySchema,
  updateDeliveryStatusSchema,
  updateDeliveryOperationalSchema,
  updateDeliveryTrackingSchema,
  proofOfDeliverySchema,
  deliveryIdParamsSchema
} from '../validators/delivery.schemas.js';

import {
  registerDeliveryAttemptSchema
} from '../validators/delivery-attempts.schemas.js';

const router = Router();

const allowedReceiptTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf'
];

const receiptUploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedReceiptTypes.includes(file.mimetype)) {
      return callback(
        new customError(
          ERROR_CODES.INVALID_FILE_TYPE,
          'Formato no permitido. Utilizá JPG, PNG o PDF.'
        )
      );
    }

    callback(null, true);
  }
});

// Todas las rutas de entregas requieren autenticación.
router.use(authenticate);

// Listado y detalle
router.get(
  '/',
  authorizeRoles('admin', 'customer', 'driver'),
  asyncHandler(deliveryController.getAll)
);

router.get(
  '/:did',
  authorizeRoles('admin', 'customer', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryController.getById)
);

// Información logística
router.get(
  '/:did/logistics',
  authorizeRoles('admin', 'customer', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryLogisticsController.getDetails)
);

router.patch(
  '/:did/logistics',
  authorizeRoles('admin'),
  validateParams(deliveryIdParamsSchema),
  validateBody(updateDeliveryOperationalSchema),
  asyncHandler(deliveryLogisticsController.updateOperations)
);

// Seguimiento GPS
router.get(
  '/:did/locations',
  authorizeRoles('admin', 'customer', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryLogisticsController.getLocations)
);

router.post(
  '/:did/locations',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  validateBody(updateDeliveryTrackingSchema),
  asyncHandler(deliveryLogisticsController.registerLocation)
);

// Comprobante estructurado
router.get(
  '/:did/proof',
  authorizeRoles('admin', 'customer', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryLogisticsController.getProof)
);

router.post(
  '/:did/proof',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  validateBody(proofOfDeliverySchema),
  asyncHandler(deliveryLogisticsController.registerProof)
);

// Intentos e incidencias
router.get(
  '/:did/attempts',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryAttemptsController.getAll)
);

router.post(
  '/:did/attempts',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  validateBody(registerDeliveryAttemptSchema),
  asyncHandler(deliveryAttemptsController.register)
);

// Crear entrega
router.post(
  '/',
  authorizeRoles('admin'),
  validateBody(createDeliverySchema),
  asyncHandler(deliveryController.create)
);

// Actualizar estado
router.patch(
  '/:did/status',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  validateBody(updateDeliveryStatusSchema),
  asyncHandler(deliveryController.updateStatus)
);

// Eliminar entrega
router.delete(
  '/:did',
  authorizeRoles('admin'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryController.remove)
);

// Guardar comprobante en MongoDB GridFS
router.post(
  '/:did/receipt',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  handleUpload(receiptUploader.single('receipt')),
  asyncHandler(deliveryReceiptController.upload)
);

// Consultar o descargar comprobante guardado.
// GET /api/deliveries/:did/receipt
// GET /api/deliveries/:did/receipt?download=1
router.get(
  '/:did/receipt',
  authorizeRoles('admin', 'customer', 'driver'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryReceiptController.download)
);

export default router;
