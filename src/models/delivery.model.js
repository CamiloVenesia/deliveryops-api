import mongoose from 'mongoose';

import {
  CURRENCIES,
  DELIVERY_ATTEMPT_OUTCOMES,
  DELIVERY_STATUSES,
  LOCATION_SOURCES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  PRIORITY_LEVELS,
  STATUS_HISTORY_ROLES,
  STATUS_HISTORY_SOURCES,
  VEHICLE_TYPES
} from '../constants/logistics.constants.js';

const coordinateSchema =
  new mongoose.Schema(
    {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        required: true
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        required: true
      },

      address: {
        type: String,
        trim: true,
        default: null
      }
    },
    {
      _id: false
    }
  );

const locationHistorySchema =
  new mongoose.Schema(
    {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        required: true
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        required: true
      },

      accuracyMeters: {
        type: Number,
        min: 0,
        default: null
      },

      speedKph: {
        type: Number,
        min: 0,
        default: null
      },

      heading: {
        type: Number,
        min: 0,
        max: 360,
        default: null
      },

      source: {
        type: String,
        enum: LOCATION_SOURCES,
        default: 'gps'
      },

      recordedAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: false
    }
  );

const routeSchema =
  new mongoose.Schema(
    {
      origin: {
        type: coordinateSchema,
        default: null
      },

      destination: {
        type: coordinateSchema,
        default: null
      },

      distanceKm: {
        type: Number,
        min: 0,
        default: null
      },

      estimatedDurationMinutes: {
        type: Number,
        min: 0,
        default: null
      },

      polyline: {
        type: String,
        default: null
      },

      calculatedAt: {
        type: Date,
        default: null
      }
    },
    {
      _id: false
    }
  );

const proofOfDeliverySchema =
  new mongoose.Schema(
    {
      receivedBy: {
        type: String,
        trim: true,
        default: null
      },

      documentNumber: {
        type: String,
        trim: true,
        default: null
      },

      relationship: {
        type: String,
        trim: true,
        default: null
      },

      signatureUrl: {
        type: String,
        default: null
      },

      photoUrls: {
        type: [String],
        default: []
      },

      notes: {
        type: String,
        trim: true,
        default: null
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null
      },

      receivedAt: {
        type: Date,
        default: null
      }
    },
    {
      _id: false
    }
  );

const deliveryCostSchema =
  new mongoose.Schema(
    {
      currency: {
        type: String,
        enum: CURRENCIES,
        default: 'ARS'
      },

      plannedCost: {
        type: Number,
        min: 0,
        default: 0
      },

      fuelCost: {
        type: Number,
        min: 0,
        default: 0
      },

      tollCost: {
        type: Number,
        min: 0,
        default: 0
      },

      additionalCost: {
        type: Number,
        min: 0,
        default: 0
      },

      totalActualCost: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

const vehicleSchema =
  new mongoose.Schema(
    {
      type: {
        type: String,
        enum: VEHICLE_TYPES,
        default: null
      },

      plate: {
        type: String,
        uppercase: true,
        trim: true,
        default: null
      },

      description: {
        type: String,
        trim: true,
        default: null
      }
    },
    {
      _id: false
    }
  );

const deliveryAttemptSchema =
  new mongoose.Schema(
    {
      attemptedAt: {
        type: Date,
        default: Date.now
      },

      outcome: {
        type: String,
        enum: DELIVERY_ATTEMPT_OUTCOMES,
        required: true
      },

      notes: {
        type: String,
        trim: true,
        default: null
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null
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
        enum: DELIVERY_STATUSES,
        default: null
      },

      to: {
        type: String,
        enum: DELIVERY_STATUSES,
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

const deliverySchema =
  new mongoose.Schema(
    {
      trackingCode: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true
      },

      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'El pedido es obligatorio']
      },

      driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      originDepot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Depot',
        default: null
      },

      status: {
        type: String,
        enum: DELIVERY_STATUSES,
        default: 'pending'
      },

      priority: {
        type: String,
        enum: PRIORITY_LEVELS,
        default: 'normal'
      },

      vehicle: {
        type: vehicleSchema,
        default: null
      },

      route: {
        type: routeSchema,
        default: null
      },

      currentLocation: {
        type: coordinateSchema,
        default: null
      },

      locationHistory: {
        type: [locationHistorySchema],
        default: []
      },

      proofOfDelivery: {
        type: proofOfDeliverySchema,
        default: null
      },

      deliveryAttempts: {
        type: [deliveryAttemptSchema],
        default: []
      },

      costs: {
        type: deliveryCostSchema,
        default: null
      },

      assignedAt: {
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

      estimatedDeliveryAt: {
        type: Date,
        default: null
      },

      cancellationReason: {
        type: String,
        trim: true,
        default: null
      },

      driverNotes: {
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
      },

      metrics: {
        distanceKm: {
          type: Number,
          min: 0,
          default: null
        },

        estimatedDurationMinutes: {
          type: Number,
          min: 0,
          default: null
        },

        actualDurationMinutes: {
          type: Number,
          min: 0,
          default: null
        },

        waitingMinutes: {
          type: Number,
          min: 0,
          default: null
        }
      }
    },
    {
      timestamps: true
    }
  );

deliverySchema.index({
  driver: 1,
  status: 1
});

deliverySchema.index({
  order: 1
});

deliverySchema.index({
  originDepot: 1,
  status: 1
});

deliverySchema.index({
  createdAt: -1
});

const Delivery =
  mongoose.model(
    'Delivery',
    deliverySchema
  );

export default Delivery;