// src/routes/orders.routes.js

import { Router } from 'express';

import { orderController } from '../controllers/order.controller.js';

import { asyncHandler } from '../utils/asyncHandler.js';

import { createUploader } from '../config/multer.config.js';

import { handleUpload } from '../middleware/handleUpload.js';

import { authenticate } from '../middleware/authenticate.js';

import { authorizeRoles } from '../middleware/authorizeRoles.js';

const router =
    Router();

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