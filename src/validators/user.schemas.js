import { z } from 'zod';

import {
  DOCUMENT_TYPES,
  DRIVER_AVAILABILITY_STATUSES,
  USER_ROLES,
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

const optionalPhoneSchema =
  z
    .string()
    .trim()
    .min(6)
    .max(30)
    .optional()
    .nullable();

const addressSchema =
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

const driverProfileSchema =
  z
    .object({
      licenseNumber:
        optionalText(80),

      licenseExpiresAt:
        z
          .string()
          .datetime()
          .optional()
          .nullable(),

      vehicleType:
        z
          .enum(
            VEHICLE_TYPES
          )
          .optional()
          .nullable(),

      vehiclePlate:
        optionalText(30),

      vehicleDescription:
        optionalText(255),

      maxWeightKg:
        z
          .number()
          .nonnegative()
          .optional()
          .nullable(),

      availabilityStatus:
        z
          .enum(
            DRIVER_AVAILABILITY_STATUSES
          )
          .optional()
    })
    .optional()
    .nullable();

const notificationPreferencesSchema =
  z
    .object({
      email:
        z
          .boolean()
          .optional(),

      whatsapp:
        z
          .boolean()
          .optional(),

      sms:
        z
          .boolean()
          .optional(),

      push:
        z
          .boolean()
          .optional()
    })
    .optional();

export const createUserSchema =
  z.object({
    firstName:
      z
        .string()
        .trim()
        .min(2)
        .max(80),

    lastName:
      z
        .string()
        .trim()
        .min(2)
        .max(80),

    email:
      z
        .string()
        .trim()
        .email()
        .max(180),

    password:
      z
        .string()
        .min(8)
        .max(128),

    role:
      z
        .enum(
          USER_ROLES
        )
        .optional(),

    phone:
      optionalPhoneSchema,

    alternatePhone:
      optionalPhoneSchema,

    documentType:
      z
        .enum(
          DOCUMENT_TYPES
        )
        .optional()
        .nullable(),

    documentNumber:
      optionalText(50),

    companyName:
      optionalText(150),

    address:
      addressSchema,

    driverProfile:
      driverProfileSchema,

    notificationPreferences:
      notificationPreferencesSchema
  });

export const updateUserProfileSchema =
  z.object({
    firstName:
      z
        .string()
        .trim()
        .min(2)
        .max(80)
        .optional(),

    lastName:
      z
        .string()
        .trim()
        .min(2)
        .max(80)
        .optional(),

    phone:
      optionalPhoneSchema,

    alternatePhone:
      optionalPhoneSchema,

    documentType:
      z
        .enum(
          DOCUMENT_TYPES
        )
        .optional()
        .nullable(),

    documentNumber:
      optionalText(50),

    companyName:
      optionalText(150),

    address:
      addressSchema,

    driverProfile:
      driverProfileSchema,

    notificationPreferences:
      notificationPreferencesSchema
  });

export const userIdParamsSchema =
  z.object({
    uid:
      objectIdSchema
  });