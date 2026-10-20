
import { Router } from 'express';

import User from '../models/user.model.js';
import NotificationJob from '../models/notification-job.model.js';

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
    customError
} from '../utils/customError.js';

import {
    ERROR_CODES
} from '../constants/error.constants.js';

import {
    normalizeWhatsappPhone
} from '../services/notification-provider.service.js';

const router = Router();

router.use(authenticate);

function invalid(message) {
    throw new customError(
        ERROR_CODES.VALIDATION_ERROR,
        message
    );
}

router.get(
    '/preferences',
    asyncHandler(async (req, res) => {
        const user = await User.findById(
            req.user.id
        );

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        res.json({
            email:
                user.notificationPreferences?.email !== false,
            whatsapp:
                user.notificationPreferences?.whatsapp === true,
            phone: user.phone || ''
        });
    })
);

router.patch(
    '/preferences',
    asyncHandler(async (req, res) => {
        const {
            email,
            whatsapp,
            phone,
            whatsappConsent
        } = req.body ?? {};

        if (
            email !== undefined &&
            typeof email !== 'boolean'
        ) {
            invalid('email debe ser booleano');
        }

        if (
            whatsapp !== undefined &&
            typeof whatsapp !== 'boolean'
        ) {
            invalid('whatsapp debe ser booleano');
        }

        if (
            phone !== undefined &&
            (
                typeof phone !== 'string' ||
                phone.length > 25
            )
        ) {
            invalid('Teléfono inválido');
        }

        if (
            email === undefined &&
            whatsapp === undefined &&
            phone === undefined
        ) {
            invalid('No hay cambios para guardar');
        }

        const user = await User.findById(
            req.user.id
        );

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        const nextPhone =
            phone === undefined
                ? user.phone
                : phone.trim();

        const turningOnWhatsapp =
            whatsapp === true &&
            user.notificationPreferences?.whatsapp !== true;

        const whatsappEnabled =
            whatsapp === undefined
                ? user.notificationPreferences?.whatsapp === true
                : whatsapp;

        if (
            whatsappEnabled &&
            !normalizeWhatsappPhone(nextPhone)
        ) {
            invalid(
                'Para habilitar WhatsApp ingresá un número E.164, por ejemplo +5493411234567'
            );
        }

        if (
            turningOnWhatsapp &&
            whatsappConsent !== true
        ) {
            invalid(
                'Para activar WhatsApp debés aceptar expresamente recibir notificaciones'
            );
        }

        user.notificationPreferences ??= {};

        if (email !== undefined) {
            user.notificationPreferences.email = email;
        }

        if (whatsapp !== undefined) {
            user.notificationPreferences.whatsapp =
                whatsapp;
        }

        if (phone !== undefined) {
            user.phone = nextPhone;
        }

        await user.save();

        res.json({
            email:
                user.notificationPreferences.email !== false,
            whatsapp:
                user.notificationPreferences.whatsapp === true,
            phone: user.phone || ''
        });
    })
);

router.get(
    '/me',
    asyncHandler(async (req, res) => {
        const items = await NotificationJob.find({
            userId: req.user.id
        })
            .sort({
                createdAt: -1
            })
            .limit(30)
            .select(
                'event channel status attempts sentAt createdAt error'
            );

        res.json({ items });
    })
);

router.get(
    '/jobs',
    authorizeRoles('admin'),
    asyncHandler(async (_req, res) => {
        const items = await NotificationJob.find()
            .sort({
                createdAt: -1
            })
            .limit(50)
            .select(
                'event entityType entityId channel status attempts createdAt sentAt error'
            );

        res.json({ items });
    })
);

export default router;
