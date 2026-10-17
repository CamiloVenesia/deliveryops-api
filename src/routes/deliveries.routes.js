
import { Router } from 'express';

import { deliveryController } from '../controllers/delivery.controller.js';

import {
  deliveryLogisticsController
} from '../controllers/delivery-logistics.controller.js';

import {
  deliveryAttemptsController
} from '../controllers/delivery-attempts.controller.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { createUploader } from '../config/multer.config.js';
import { handleUpload } from '../middleware/handleUpload.js';

import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';

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

const receiptUploader = createUploader('deliveries/receipts');

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

// Prueba de entrega
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

// Intentos de entrega
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

// Operaciones anteriores
router.post(
  '/',
  authorizeRoles('admin'),
  validateBody(createDeliverySchema),
  asyncHandler(deliveryController.create)
);

router.patch(
  '/:did/status',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  validateBody(updateDeliveryStatusSchema),
  asyncHandler(deliveryController.updateStatus)
);

router.delete(
  '/:did',
  authorizeRoles('admin'),
  validateParams(deliveryIdParamsSchema),
  asyncHandler(deliveryController.remove)
);

router.post(
  '/:did/receipt',
  authorizeRoles('admin', 'driver'),
  validateParams(deliveryIdParamsSchema),
  handleUpload(receiptUploader.single('receipt')),
  asyncHandler(deliveryController.addReceipt)
);

export default router;
