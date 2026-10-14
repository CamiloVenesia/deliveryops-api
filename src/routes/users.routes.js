// src/routes/users.routes.js

import { Router } from 'express';

import { userController } from '../controllers/user.controller.js';

import { asyncHandler } from '../utils/asyncHandler.js';

import { createUploader } from '../config/multer.config.js';

import { handleUpload } from '../middleware/handleUpload.js';

import { authenticate } from '../middleware/authenticate.js';

import {
    authorizeRoles,
    authorizeSelfOrRoles
} from '../middleware/authorizeRoles.js';

import {
    validateBody,
    validateParams
} from '../middleware/validate.js';

import {
    createUserSchema,
    userIdParamsSchema
} from '../validators/user.schemas.js';

const router = Router();

const documentUploader =
    createUploader(
        'users/documents'
    );

router.get(
    '/',
    authenticate,
    authorizeRoles('admin'),
    asyncHandler(
        userController.getAll
    )
);

router.get(
    '/:uid',
    authenticate,
    validateParams(
        userIdParamsSchema
    ),
    authorizeSelfOrRoles(
        'admin'
    ),
    asyncHandler(
        userController.getById
    )
);

router.post(
    '/',
    validateBody(
        createUserSchema
    ),
    asyncHandler(
        userController.create
    )
);

router.delete(
    '/:uid',
    authenticate,
    validateParams(
        userIdParamsSchema
    ),
    authorizeRoles('admin'),
    asyncHandler(
        userController.remove
    )
);

router.post(
    '/:uid/documents',
    authenticate,
    validateParams(
        userIdParamsSchema
    ),
    authorizeSelfOrRoles(
        'admin'
    ),
    handleUpload(
        documentUploader.single(
            'document'
        )
    ),
    asyncHandler(
        userController.addDocument
    )
);

export default router;