
import { Router } from 'express';

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
    routePlanningService
} from '../services/route-planning.service.js';

const router = Router();

router.use(authenticate);

// Vista previa de solo lectura.
// Los repartidores únicamente pueden consultar su propia ruta.
router.get(
    '/drivers/:driverId',
    authorizeRoles('admin', 'driver'),
    asyncHandler(async (req, res) => {
        const preview =
            await routePlanningService.preview(
                req.params.driverId,
                req.user
            );

        res.json(preview);
    })
);

export default router;
