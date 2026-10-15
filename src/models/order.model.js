import mongoose from 'mongoose';

import {
    ORDER_STATUSES
} from '../constants/status.constants.js';

const orderItemSchema =
    new mongoose.Schema(
        {
            name: {
                type:
                    String,

                required: [
                    true,
                    'El nombre del item es obligatorio'
                ]
            },

            quantity: {
                type:
                    Number,

                required: [
                    true,
                    'La cantidad es obligatoria'
                ],

                min: [
                    1,
                    'La cantidad mínima es 1'
                ]
            },

            price: {
                type:
                    Number,

                required: [
                    true,
                    'El precio es obligatorio'
                ],

                min: [
                    0,
                    'El precio no puede ser negativo'
                ]
            }
        },
        {
            _id:
                false
        }
    );

const statusHistorySchema =
    new mongoose.Schema(
        {
            from: {
                type:
                    String,

                enum: [
                    ...ORDER_STATUSES,
                    null
                ],

                default:
                    null
            },

            to: {
                type:
                    String,

                enum:
                    ORDER_STATUSES,

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
                    'order'
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

const orderSchema =
    new mongoose.Schema(
        {
            customer: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    'User',

                required: [
                    true,
                    'El cliente es obligatorio'
                ]
            },

            items: {
                type: [
                    orderItemSchema
                ],

                validate: {
                    validator:
                        (value) =>
                            value.length >
                            0,

                    message:
                        'El pedido debe tener al menos un item'
                }
            },

            deliveryAddress: {
                type:
                    String,

                required: [
                    true,
                    'La dirección de entrega es obligatoria'
                ]
            },

            total: {
                type:
                    Number,

                default:
                    0
            },

            status: {
                type:
                    String,

                enum:
                    ORDER_STATUSES,

                default:
                    'created'
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

            delivery: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    'Delivery',

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

const Order =
    mongoose.model(
        'Order',
        orderSchema
    );

export default Order;