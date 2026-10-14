// src/routes/deliveries.routes.js

import { Router } from 'express';

import { deliveryController } from '../controllers/delivery.controller.js';

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
    deliveryIdParamsSchema
} from '../validators/delivery.schemas.js';

const router = Router();

const receiptUploader =
    createUploader(
        'deliveries/receipts'
    );

router.get(
    '/',
    authenticate,
    authorizeRoles(
        'admin',
        'customer',
        'driver'
    ),
    asyncHandler(
        deliveryController.getAll
    )
);

router.get(
    '/:did',
    authenticate,
    authorizeRoles(
        'admin',
        'customer',
        'driver'
    ),
    validateParams(
        deliveryIdParamsSchema
    ),
    asyncHandler(
        deliveryController.getById
    )
);

router.post(
    '/',
    authenticate,
    authorizeRoles(
        'admin'
    ),
    validateBody(
        createDeliverySchema
    ),
    asyncHandler(
        deliveryController.create
    )
);

router.patch(
    '/:did/status',
    authenticate,
    authorizeRoles(
        'admin',
        'driver'
    ),
    validateParams(
        deliveryIdParamsSchema
    ),
    validateBody(
        updateDeliveryStatusSchema
    ),
    asyncHandler(
        deliveryController.updateStatus
    )
);

router.delete(
    '/:did',
    authenticate,
    authorizeRoles(
        'admin'
    ),
    validateParams(
        deliveryIdParamsSchema
    ),
    asyncHandler(
        deliveryController.remove
    )
);

router.post(
    '/:did/receipt',
    authenticate,
    authorizeRoles(
        'admin',
        'driver'
    ),
    validateParams(
        deliveryIdParamsSchema
    ),
    handleUpload(
        receiptUploader.single(
            'receipt'
        )
    ),
    asyncHandler(
        deliveryController.addReceipt
    )
);

export default router;