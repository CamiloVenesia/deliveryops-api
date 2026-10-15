import mongoose from 'mongoose';

import {
    DELIVERY_STATUSES
} from '../constants/status.constants.js';

const statusHistorySchema =
    new mongoose.Schema(
        {
            from: {
                type:
                    String,

                enum: [
                    ...DELIVERY_STATUSES,
                    null
                ],

                default:
                    null
            },

            to: {
                type:
                    String,

                enum:
                    DELIVERY_STATUSES,

                required:
                    true
            },

            changedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    'User',

                default:
                    null
            },

            changedByRole: {
                type:
                    String,

                enum: [
                    'admin',
                    'customer',
                    'driver',
                    'store',
                    'system'
                ],

                default:
                    'system'
            },

            source: {
                type:
                    String,

                enum: [
                    'order',
                    'delivery',
                    'system'
                ],

                default:
                    'delivery'
            },

            changedAt: {
                type:
                    Date,

                default:
                    Date.now
            }
        },
        {
            _id:
                false
        }
    );

const deliverySchema =
    new mongoose.Schema(
        {
            order: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    'Order',

                required: [
                    true,
                    'El pedido es obligatorio'
                ]
            },

            driver: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    'User',

                default:
                    null
            },

            status: {
                type:
                    String,

                enum:
                    DELIVERY_STATUSES,

                default:
                    'pending'
            },

            priority: {
                type:
                    String,

                enum: [
                    'low',
                    'normal',
                    'high'
                ],

                default:
                    'normal'
            },

            assignedAt: {
                type:
                    Date,

                default:
                    null
            },

            deliveredAt: {
                type:
                    Date,

                default:
                    null
            },

            statusHistory: {
                type: [
                    statusHistorySchema
                ],

                default:
                    []
            },

            receipt: {
                type: {
                    originalName: {
                        type:
                            String
                    },

                    generatedName: {
                        type:
                            String
                    },

                    path: {
                        type:
                            String
                    },

                    mimetype: {
                        type:
                            String
                    },

                    size: {
                        type:
                            Number
                    },

                    uploadedAt: {
                        type:
                            Date
                    }
                },

                default:
                    null
            }
        },
        {
            timestamps:
                true
        }
    );

const Delivery =
    mongoose.model(
        'Delivery',
        deliverySchema
    );

export default Delivery;