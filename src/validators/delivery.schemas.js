import { z } from 'zod';

import {
  CURRENCIES,
  DELIVERY_ATTEMPT_OUTCOMES,
  DELIVERY_STATUSES,
  LOCATION_SOURCES,
  PRIORITY_LEVELS,
  VEHICLE_TYPES
} from '../constants/logistics.constants.js';

import {
  objectIdSchema
} from './common.schemas.js';

const optionalText = (
  max = 255
) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional()
    .nullable();

const coordinateSchema =
  z.object({
    latitude:
      z
        .number()
        .min(-90)
        .max(90),

    longitude:
      z
        .number()
        .min(-180)
        .max(180),

    address:
      optionalText(500)
  });

const vehicleSchema =
  z
    .object({
      type:
        z
          .enum(
            VEHICLE_TYPES
          )
          .optional()
          .nullable(),

      plate:
        optionalText(30),

      description:
        optionalText(255)
    })
    .optional()
    .nullable();

const routeSchema =
  z
    .object({
      origin:
        coordinateSchema
          .optional()
          .nullable(),

      destination:
        coordinateSchema
          .optional()
          .nullable(),

      distanceKm:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      estimatedDurationMinutes:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      polyline:
        optionalText(10000)
    })
    .optional()
    .nullable();

const deliveryCostSchema =
  z
    .object({
      currency:
        z
          .enum(
            CURRENCIES
          )
          .optional(),

      plannedCost:
        z
          .number()
          .nonnegative()
          .optional(),

      fuelCost:
        z
          .number()
          .nonnegative()
          .optional(),

      tollCost:
        z
          .number()
          .nonnegative()
          .optional(),

      additionalCost:
        z
          .number()
          .nonnegative()
          .optional(),

      totalActualCost:
        z
          .number()
          .nonnegative()
          .optional()
    })
    .optional()
    .nullable();

export const createDeliverySchema =
  z.object({
    order:
      objectIdSchema,

    driver:
      objectIdSchema,

    priority:
      z
        .enum(
          PRIORITY_LEVELS
        )
        .optional(),

    originDepot:
      objectIdSchema
        .optional()
        .nullable(),

    vehicle:
      vehicleSchema,

    route:
      routeSchema,

    estimatedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable(),

    trackingCode:
      optionalText(80),

    costs:
      deliveryCostSchema,

    driverNotes:
      optionalText(1000)
  });

export const updateDeliveryStatusSchema =
  z.object({
    status:
      z.enum(
        DELIVERY_STATUSES
      ),

    cancellationReason:
      optionalText(500),

    note:
      optionalText(500)
  });

export const updateDeliveryTrackingSchema =
  z.object({
    latitude:
      z
        .number()
        .min(-90)
        .max(90),

    longitude:
      z
        .number()
        .min(-180)
        .max(180),

    accuracyMeters:
      z
        .number()
        .nonnegative()
        .optional()
        .nullable(),

    speedKph:
      z
        .number()
        .nonnegative()
        .optional()
        .nullable(),

    heading:
      z
        .number()
        .min(0)
        .max(360)
        .optional()
        .nullable(),

    source:
      z
        .enum(
          LOCATION_SOURCES
        )
        .optional()
  });

export const proofOfDeliverySchema =
  z.object({
    receivedBy:
      z
        .string()
        .trim()
        .min(2)
        .max(180),

    documentNumber:
      optionalText(50),

    relationship:
      optionalText(100),

    signatureUrl:
      optionalText(1000),

    photoUrls:
      z
        .array(
          z
            .string()
            .trim()
            .min(1)
        )
        .max(10)
        .optional(),

    notes:
      optionalText(1000),

    latitude:
      z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .nullable(),

    longitude:
      z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .nullable()
  });

export const deliveryAttemptSchema =
  z.object({
    outcome:
      z.enum(
        DELIVERY_ATTEMPT_OUTCOMES
      ),

    notes:
      optionalText(1000),

    latitude:
      z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .nullable(),

    longitude:
      z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .nullable()
  });

export const updateDeliveryOperationalSchema =
  z.object({
    priority:
      z
        .enum(
          PRIORITY_LEVELS
        )
        .optional(),

    originDepot:
      objectIdSchema
        .optional()
        .nullable(),

    vehicle:
      vehicleSchema,

    route:
      routeSchema,

    estimatedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable(),

    costs:
      deliveryCostSchema,

    driverNotes:
      optionalText(1000)
  });

export const deliveryIdParamsSchema =
  z.object({
    did:
      objectIdSchema
  });