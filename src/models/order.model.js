import mongoose from 'mongoose';

import {
  CURRENCIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  ORDER_SOURCE_CHANNELS,
  ORDER_STATUSES,
  PACKAGE_TYPES,
  PRIORITY_LEVELS,
  STATUS_HISTORY_ROLES,
  STATUS_HISTORY_SOURCES
} from '../constants/logistics.constants.js';

const dimensionsSchema = new mongoose.Schema(
  {
    lengthCm: {
      type: Number,
      min: 0,
      default: null
    },

    widthCm: {
      type: Number,
      min: 0,
      default: null
    },

    heightCm: {
      type: Number,
      min: 0,
      default: null
    }
  },
  {
    _id: false
  }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },

    sku: {
      type: String,
      trim: true,
      default: null
    },

    barcode: {
      type: String,
      trim: true,
      default: null
    },

    name: {
      type: String,
      required: [true, 'El nombre del item es obligatorio'],
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: null
    },

    quantity: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [1, 'La cantidad minima es 1']
    },

    price: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },

    weightKg: {
      type: Number,
      min: 0,
      default: null
    },

    dimensions: {
      type: dimensionsSchema,
      default: null
    },

    fragile: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const recipientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      trim: true
    },

    alternatePhone: {
      type: String,
      trim: true
    },

    documentType: {
      type: String,
      trim: true
    },

    documentNumber: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

const deliveryAddressDetailsSchema =
  new mongoose.Schema(
    {
      street: {
        type: String,
        trim: true
      },

      number: {
        type: String,
        trim: true
      },

      neighborhood: {
        type: String,
        trim: true
      },

      city: {
        type: String,
        trim: true
      },

      province: {
        type: String,
        trim: true
      },

      postalCode: {
        type: String,
        trim: true
      },

      country: {
        type: String,
        trim: true,
        default: 'Argentina'
      },

      floor: {
        type: String,
        trim: true
      },

      unit: {
        type: String,
        trim: true
      },

      tower: {
        type: String,
        trim: true
      },

      buildingName: {
        type: String,
        trim: true
      },

      reference: {
        type: String,
        trim: true
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    {
      _id: false
    }
  );

const packageInfoSchema =
  new mongoose.Schema(
    {
      packageCount: {
        type: Number,
        min: 1,
        default: 1
      },

      packageType: {
        type: String,
        enum: PACKAGE_TYPES,
        default: 'box'
      },

      totalWeightKg: {
        type: Number,
        min: 0,
        default: null
      },

      dimensions: {
        type: dimensionsSchema,
        default: null
      },

      fragile: {
        type: Boolean,
        default: false
      },

      requiresSignature: {
        type: Boolean,
        default: false
      },

      temperatureControlled: {
        type: Boolean,
        default: false
      },

      declaredValue: {
        type: Number,
        min: 0,
        default: null
      }
    },
    {
      _id: false
    }
  );

const shippingCostSchema =
  new mongoose.Schema(
    {
      currency: {
        type: String,
        enum: CURRENCIES,
        default: 'ARS'
      },

      baseCost: {
        type: Number,
        min: 0,
        default: 0
      },

      distanceCost: {
        type: Number,
        min: 0,
        default: 0
      },

      weightCost: {
        type: Number,
        min: 0,
        default: 0
      },

      prioritySurcharge: {
        type: Number,
        min: 0,
        default: 0
      },

      additionalCost: {
        type: Number,
        min: 0,
        default: 0
      },

      total: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

const statusHistorySchema =
  new mongoose.Schema(
    {
      from: {
        type: String,
        enum: ORDER_STATUSES,
        default: null
      },

      to: {
        type: String,
        enum: ORDER_STATUSES,
        required: true
      },

      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      changedByRole: {
        type: String,
        enum: STATUS_HISTORY_ROLES,
        default: 'system'
      },

      source: {
        type: String,
        enum: STATUS_HISTORY_SOURCES,
        default: 'system'
      },

      changedAt: {
        type: Date,
        default: Date.now
      },

      note: {
        type: String,
        trim: true,
        default: null
      }
    },
    {
      _id: false
    }
  );

const notificationSchema =
  new mongoose.Schema(
    {
      channel: {
        type: String,
        enum: NOTIFICATION_CHANNELS,
        required: true
      },

      event: {
        type: String,
        required: true,
        trim: true
      },

      recipient: {
        type: String,
        trim: true
      },

      status: {
        type: String,
        enum: NOTIFICATION_STATUSES,
        default: 'pending'
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
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: false
    }
  );

const receiptSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String
      },

      generatedName: {
        type: String
      },

      path: {
        type: String
      },

      mimetype: {
        type: String
      },

      size: {
        type: Number
      },

      uploadedAt: {
        type: Date
      }
    },
    {
      _id: false
    }
  );

const orderSchema =
  new mongoose.Schema(
    {
      trackingCode: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true
      },

      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El cliente es obligatorio']
      },

      recipient: {
        type: recipientSchema,
        default: null
      },

      items: {
        type: [orderItemSchema],
        validate: {
          validator: (value) =>
            value.length > 0,

          message:
            'El pedido debe tener al menos un item'
        }
      },

      deliveryAddress: {
        type: String,
        required: [
          true,
          'La direccion de entrega es obligatoria'
        ],
        trim: true
      },

      deliveryAddressDetails: {
        type: deliveryAddressDetailsSchema,
        default: null
      },

      deliveryInstructions: {
        type: String,
        trim: true,
        default: null
      },

      contactlessDelivery: {
        type: Boolean,
        default: false
      },

      internalNotes: {
        type: String,
        trim: true,
        default: null
      },

      packageInfo: {
        type: packageInfoSchema,
        default: () => ({})
      },

      total: {
        type: Number,
        default: 0,
        min: 0
      },

      shippingCost: {
        type: shippingCostSchema,
        default: null
      },

      status: {
        type: String,
        enum: ORDER_STATUSES,
        default: 'created'
      },

      priority: {
        type: String,
        enum: PRIORITY_LEVELS,
        default: 'normal'
      },

      sourceChannel: {
        type: String,
        enum: ORDER_SOURCE_CHANNELS,
        default: 'web'
      },

      originDepot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Depot',
        default: null
      },

      delivery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery',
        default: null
      },

      requestedDeliveryAt: {
        type: Date,
        default: null
      },

      estimatedDeliveryAt: {
        type: Date,
        default: null
      },

      pickedUpAt: {
        type: Date,
        default: null
      },

      inTransitAt: {
        type: Date,
        default: null
      },

      deliveredAt: {
        type: Date,
        default: null
      },

      cancelledAt: {
        type: Date,
        default: null
      },

      cancellationReason: {
        type: String,
        trim: true,
        default: null
      },

      statusHistory: {
        type: [statusHistorySchema],
        default: []
      },

      notifications: {
        type: [notificationSchema],
        default: []
      },

      receipt: {
        type: receiptSchema,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

orderSchema.index({
  customer: 1,
  createdAt: -1
});

orderSchema.index({
  status: 1,
  priority: 1
});

orderSchema.index({
  delivery: 1
});

orderSchema.index({
  originDepot: 1,
  status: 1
});

const Order =
  mongoose.model(
    'Order',
    orderSchema
  );

export default Order;