
import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

router.get(
  '/dashboard',
  asyncHandler(analyticsController.getDashboard)
);

export default router;
