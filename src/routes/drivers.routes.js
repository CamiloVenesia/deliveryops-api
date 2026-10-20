
import { Router } from 'express';

import {
    driversController
} from '../controllers/drivers.controller.js';

import {
    dispatchController
} from '../controllers/dispatch.controller.js';

import {
    authenticate
} from '../middleware/authenticate.js';

import {
    authorizeRoles
} from '../middleware/authorizeRoles.js';

import {
    asyncHandler
} from '../utils/asyncHandler.js';

import {
    validateBody,
    validateParams
} from '../middleware/validate.js';

import {
    driverIdParamsSchema,
    updateDriverAvailabilitySchema,
    updateDriverCapacitySchema
} from '../validators/driver.schemas.js';

const router = Router();

router.use(authenticate);

router.get(
    '/',
    authorizeRoles('admin'),
    asyncHandler(driversController.list)
);

router.get(
    '/recommendations',
    authorizeRoles('admin'),
    asyncHandler(dispatchController.recommendations)
);

router.get(
    '/me',
    authorizeRoles('driver'),
    asyncHandler(driversController.getMe)
);

router.get(
    '/:did',
    authorizeRoles('admin', 'driver'),
    validateParams(driverIdParamsSchema),
    asyncHandler(driversController.getById)
);

router.patch(
    '/:did/availability',
    authorizeRoles('admin', 'driver'),
    validateParams(driverIdParamsSchema),
    validateBody(updateDriverAvailabilitySchema),
    asyncHandler(driversController.updateAvailability)
);

router.patch(
    '/:did/capacity',
    authorizeRoles('admin'),
    validateParams(driverIdParamsSchema),
    validateBody(updateDriverCapacitySchema),
    asyncHandler(driversController.updateCapacity)
);

export default router;
