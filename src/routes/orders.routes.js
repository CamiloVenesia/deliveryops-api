// src/routes/orders.routes.js

import { Router } from 'express';

import { orderController } from '../controllers/order.controller.js';

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
    createOrderSchema,
    updateOrderStatusSchema,
    orderIdParamsSchema
} from '../validators/order.schemas.js';

const router = Router();

const receiptUploader =
    createUploader(
        'orders/receipts'
    );

router.get(
    '/',
    authenticate,
    authorizeRoles(
        'admin',
        'customer'
    ),
    asyncHandler(
        orderController.getAll
    )
);

router.get(
    '/:oid',
    authenticate,
    authorizeRoles(
        'admin',
        'customer'
    ),
    validateParams(
        orderIdParamsSchema
    ),
    asyncHandler(
        orderController.getById
    )
);

router.post(
    '/',
    authenticate,
    authorizeRoles(
        'admin',
        'customer'
    ),
    validateBody(
        createOrderSchema
    ),
    asyncHandler(
        orderController.create
    )
);

router.patch(
    '/:oid/status',
    authenticate,
    authorizeRoles(
        'admin'
    ),
    validateParams(
        orderIdParamsSchema
    ),
    validateBody(
        updateOrderStatusSchema
    ),
    asyncHandler(
        orderController.updateStatus
    )
);

router.delete(
    '/:oid',
    authenticate,
    authorizeRoles(
        'admin'
    ),
    validateParams(
        orderIdParamsSchema
    ),
    asyncHandler(
        orderController.remove
    )
);

router.post(
    '/:oid/receipt',
    authenticate,
    authorizeRoles(
        'admin',
        'customer'
    ),
    validateParams(
        orderIdParamsSchema
    ),
    handleUpload(
        receiptUploader.single(
            'receipt'
        )
    ),
    asyncHandler(
        orderController.addReceipt
    )
);

export default router;