import { z } from 'zod';

import {
  CURRENCIES,
  ORDER_SOURCE_CHANNELS,
  ORDER_STATUSES,
  PACKAGE_TYPES,
  PRIORITY_LEVELS
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

const dimensionsSchema =
  z
    .object({
      lengthCm:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      widthCm:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      heightCm:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable()
    })
    .optional()
    .nullable();

const orderItemSchema =
  z.object({
    product:
      objectIdSchema
        .optional()
        .nullable(),

    sku:
      optionalText(80),

    barcode:
      optionalText(100),

    name:
      z
        .string()
        .trim()
        .min(1)
        .max(180),

    description:
      optionalText(500),

    quantity:
      z
        .number()
        .int()
        .positive(),

    price:
      z
        .number()
        .nonnegative(),

    weightKg:
      z
        .number()
        .nonnegative()
        .optional()
        .nullable(),

    dimensions:
      dimensionsSchema,

    fragile:
      z
        .boolean()
        .optional()
  });

const recipientSchema =
  z
    .object({
      fullName:
        z
          .string()
          .trim()
          .min(2)
          .max(180),

      email:
        z
          .string()
          .trim()
          .email()
          .max(180)
          .optional()
          .nullable(),

      phone:
        z
          .string()
          .trim()
          .min(6)
          .max(30)
          .optional()
          .nullable(),

      alternatePhone:
        z
          .string()
          .trim()
          .min(6)
          .max(30)
          .optional()
          .nullable(),

      documentType:
        optionalText(30),

      documentNumber:
        optionalText(50)
    })
    .optional()
    .nullable();

const deliveryAddressDetailsSchema =
  z
    .object({
      street:
        optionalText(120),

      number:
        optionalText(30),

      neighborhood:
        optionalText(120),

      city:
        optionalText(120),

      province:
        optionalText(120),

      postalCode:
        optionalText(20),

      country:
        optionalText(80),

      floor:
        optionalText(30),

      unit:
        optionalText(30),

      tower:
        optionalText(50),

      buildingName:
        optionalText(120),

      reference:
        optionalText(500),

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
    })
    .optional()
    .nullable();

const packageInfoSchema =
  z
    .object({
      packageCount:
        z
          .number()
          .int()
          .positive()
          .optional(),

      packageType:
        z
          .enum(
            PACKAGE_TYPES
          )
          .optional(),

      totalWeightKg:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      dimensions:
        dimensionsSchema,

      fragile:
        z
          .boolean()
          .optional(),

      requiresSignature:
        z
          .boolean()
          .optional(),

      temperatureControlled:
        z
          .boolean()
          .optional(),

      declaredValue:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable()
    })
    .optional();

const shippingCostSchema =
  z
    .object({
      currency:
        z
          .enum(
            CURRENCIES
          )
          .optional(),

      baseCost:
        z
          .number()
          .nonnegative()
          .optional(),

      distanceCost:
        z
          .number()
          .nonnegative()
          .optional(),

      weightCost:
        z
          .number()
          .nonnegative()
          .optional(),

      prioritySurcharge:
        z
          .number()
          .nonnegative()
          .optional(),

      additionalCost:
        z
          .number()
          .nonnegative()
          .optional(),

      total:
        z
          .number()
          .nonnegative()
          .optional()
    })
    .optional()
    .nullable();

export const createOrderSchema =
  z.object({
    customer:
      objectIdSchema
        .optional(),

    recipient:
      recipientSchema,

    items:
      z
        .array(
          orderItemSchema
        )
        .min(1),

    deliveryAddress:
      z
        .string()
        .trim()
        .min(3)
        .max(500),

    deliveryAddressDetails:
      deliveryAddressDetailsSchema,

    deliveryInstructions:
      optionalText(1000),

    contactlessDelivery:
      z
        .boolean()
        .optional(),

    internalNotes:
      optionalText(1500),

    packageInfo:
      packageInfoSchema,

    shippingCost:
      shippingCostSchema,

    priority:
      z
        .enum(
          PRIORITY_LEVELS
        )
        .optional(),

    sourceChannel:
      z
        .enum(
          ORDER_SOURCE_CHANNELS
        )
        .optional(),

    originDepot:
      objectIdSchema
        .optional()
        .nullable(),

    requestedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable(),

    estimatedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable(),

    trackingCode:
      optionalText(80)
  });

export const updateOrderStatusSchema =
  z.object({
    status:
      z.enum(
        ORDER_STATUSES
      ),

    cancellationReason:
      optionalText(500),

    note:
      optionalText(500)
  });

export const updateOrderLogisticsSchema =
  z.object({
    recipient:
      recipientSchema,

    deliveryAddress:
      z
        .string()
        .trim()
        .min(3)
        .max(500)
        .optional(),

    deliveryAddressDetails:
      deliveryAddressDetailsSchema,

    deliveryInstructions:
      optionalText(1000),

    contactlessDelivery:
      z
        .boolean()
        .optional(),

    internalNotes:
      optionalText(1500),

    packageInfo:
      packageInfoSchema,

    shippingCost:
      shippingCostSchema,

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

    requestedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable(),

    estimatedDeliveryAt:
      z
        .string()
        .datetime()
        .optional()
        .nullable()
  });

export const orderIdParamsSchema =
  z.object({
    oid:
      objectIdSchema
  });