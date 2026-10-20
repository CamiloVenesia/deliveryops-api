
import mongoose from 'mongoose';

const notificationJobSchema = new mongoose.Schema({
    eventKey: {
        type: String,
        required: true,
        unique: true
    },
    entityType: {
        type: String,
        enum: ['order', 'delivery'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channel: {
        type: String,
        enum: ['email', 'whatsapp'],
        required: true
    },
    recipient: {
        type: String,
        required: true
    },
    event: {
        type: String,
        required: true
    },
    payload: {
        name: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: [
            'queued',
            'processing',
            'sent',
            'failed',
            'skipped'
        ],
        default: 'queued'
    },
    attempts: {
        type: Number,
        default: 0
    },
    nextAttemptAt: {
        type: Date,
        default: Date.now
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    providerMessageId: {
        type: String,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    sentAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

notificationJobSchema.index({
    status: 1,
    nextAttemptAt: 1,
    lockedUntil: 1
});

export default mongoose.model(
    'NotificationJob',
    notificationJobSchema
);
