// src/routes/auth.routes.js

import { Router } from 'express';

import { authController } from '../controllers/auth.controller.js';

import { authenticate } from '../middleware/authenticate.js';

import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
    '/login',
    asyncHandler(
        authController.login
    )
);

router.post(
    '/refresh',
    asyncHandler(
        authController.refresh
    )
);

router.post(
    '/logout',
    asyncHandler(
        authController.logout
    )
);

router.get(
    '/me',
    authenticate,
    asyncHandler(
        authController.me
    )
);

export default router;