
import NotificationJob from '../models/notification-job.model.js';

import {
    notificationsEnabled
} from './notification.service.js';

import {
    notificationProviderService
} from './notification-provider.service.js';

import logger from '../utils/logger.js';

const maxAttempts = 3;
const lockMs = 60_000;
const intervalMs = 20_000;
const batchSize = 20;

let running = false;

async function claimNext() {
    const now = new Date();

    return NotificationJob.findOneAndUpdate(
        {
            $or: [
                {
                    status: 'queued',
                    nextAttemptAt: {
                        $lte: now
                    }
                },
                {
                    status: 'processing',
                    lockedUntil: {
                        $lte: now
                    }
                }
            ]
        },
        {
            $set: {
                status: 'processing',
                lockedUntil: new Date(
                    now.getTime() + lockMs
                )
            },
            $inc: {
                attempts: 1
            }
        },
        {
            sort: {
                createdAt: 1
            },
            new: true
        }
    );
}

async function processOne(job) {
    try {
        const providerMessageId =
            await notificationProviderService.send(job);

        await NotificationJob.updateOne(
            {
                _id: job._id,
                status: 'processing',
                attempts: job.attempts
            },
            {
                $set: {
                    status: 'sent',
                    sentAt: new Date(),
                    providerMessageId,
                    error: null,
                    lockedUntil: null
                }
            }
        );
    } catch (error) {
        const exhausted =
            job.attempts >= maxAttempts;

        const retryDelayMs =
            Math.min(
                60,
                2 ** job.attempts
            ) * 60_000;

        await NotificationJob.updateOne(
            {
                _id: job._id,
                status: 'processing',
                attempts: job.attempts
            },
            {
                $set: {
                    status: exhausted
                        ? 'failed'
                        : 'queued',
                    nextAttemptAt: new Date(
                        Date.now() + retryDelayMs
                    ),
                    error: String(
                        error.message
                    ).slice(0, 300),
                    lockedUntil: null
                }
            }
        );

        logger.warning(
            `Notificación ${job.id} no enviada; intento ${job.attempts}/${maxAttempts}`
        );
    }
}

export const notificationWorkerService = {
    async runOnce() {
        if (
            !notificationsEnabled() ||
            running
        ) {
            return;
        }

        running = true;

        try {
            for (
                let i = 0;
                i < batchSize;
                i += 1
            ) {
                const job = await claimNext();

                if (!job) {
                    break;
                }

                await processOne(job);
            }
        } catch (error) {
            logger.error(
                `Error en trabajador de notificaciones: ${error.message}`
            );
        } finally {
            running = false;
        }
    },

    start() {
        if (!notificationsEnabled()) {
            logger.info(
                'Notificaciones externas deshabilitadas'
            );
            return;
        }

        void this.runOnce();

        const timer = setInterval(
            () => {
                void this.runOnce();
            },
            intervalMs
        );

        timer.unref?.();

        logger.info(
            'Trabajador de notificaciones iniciado'
        );
    }
};
