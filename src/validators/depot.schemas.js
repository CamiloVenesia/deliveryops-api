
import { z } from 'zod';

const objectId = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  'ID de depósito inválido'
);

const optionalText = z.string().trim().max(500).nullable().optional();

const addressSchema = z.object({
  street: z.string().trim().min(1),
  number: z.string().trim().min(1),
  neighborhood: optionalText,
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: optionalText,
  country: z.string().trim().min(1).default('Argentina'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional()
}).strict();

const contactSchema = z.object({
  name: optionalText,
  email: z.email().nullable().optional(),
  phone: optionalText
}).strict();

const hoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  enabled: z.boolean().default(true),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/)
}).strict().refine(
  value => !value.enabled || value.open < value.close,
  { message: 'La apertura debe ser anterior al cierre' }
);

export const createDepotSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform(value => value.toUpperCase()),
  address: addressSchema,
  contact: contactSchema.nullable().optional(),
  operatingHours: z.array(hoursSchema).max(7).default([]),
  serviceAreas: z.array(z.string().trim().min(1)).default([]),
  maxDailyDeliveries: z.number().int().min(0).nullable().optional(),
  notes: optionalText,
  active: z.boolean().default(true)
}).strict();

export const updateDepotSchema = createDepotSchema.partial()
  .refine(
    value => Object.keys(value).length > 0,
    { message: 'Debe proporcionar al menos un campo' }
  );

export const depotIdParamsSchema = z.object({
  did: objectId
});

export const depotListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(100).optional()
});
