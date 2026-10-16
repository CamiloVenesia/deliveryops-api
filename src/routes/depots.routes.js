
import { Router } from 'express';

import { depotController } from '../controllers/depot.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

import {
  createDepotSchema,
  updateDepotSchema,
  depotIdParamsSchema
} from '../validators/depot.schemas.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorizeRoles('admin', 'store'),
  asyncHandler(depotController.getAll)
);

router.get(
  '/:did',
  authorizeRoles('admin', 'store'),
  validateParams(depotIdParamsSchema),
  asyncHandler(depotController.getById)
);

router.post(
  '/',
  authorizeRoles('admin'),
  validateBody(createDepotSchema),
  asyncHandler(depotController.create)
);

router.patch(
  '/:did',
  authorizeRoles('admin'),
  validateParams(depotIdParamsSchema),
  validateBody(updateDepotSchema),
  asyncHandler(depotController.update)
);

router.delete(
  '/:did',
  authorizeRoles('admin'),
  validateParams(depotIdParamsSchema),
  asyncHandler(depotController.remove)
);

export default router;
