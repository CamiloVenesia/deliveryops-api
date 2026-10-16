export const USER_ROLES = [
  'admin',
  'customer',
  'driver',
  'store'
];

export const PRIORITY_LEVELS = [
  'low',
  'normal',
  'high'
];

export const ORDER_STATUSES = [
  'created',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled'
];

export const DELIVERY_STATUSES = [
  'pending',
  'assigned',
  'in_transit',
  'delivered',
  'cancelled'
];

export const STATUS_HISTORY_ROLES = [
  'admin',
  'customer',
  'driver',
  'store',
  'system'
];

export const STATUS_HISTORY_SOURCES = [
  'order',
  'delivery',
  'system'
];

export const DOCUMENT_TYPES = [
  'dni',
  'passport',
  'cuil',
  'cuit',
  'other'
];

export const CURRENCIES = [
  'ARS',
  'USD',
  'BRL'
];

export const ORDER_SOURCE_CHANNELS = [
  'web',
  'api',
  'store',
  'admin',
  'import'
];

export const DRIVER_AVAILABILITY_STATUSES = [
  'available',
  'busy',
  'offline'
];

export const VEHICLE_TYPES = [
  'bike',
  'motorcycle',
  'car',
  'van',
  'truck',
  'other'
];

export const LOCATION_SOURCES = [
  'gps',
  'manual',
  'system'
];

export const DELIVERY_ATTEMPT_OUTCOMES = [
  'delivered',
  'recipient_absent',
  'rejected',
  'invalid_address',
  'access_problem',
  'rescheduled',
  'other'
];

export const NOTIFICATION_CHANNELS = [
  'email',
  'whatsapp',
  'sms',
  'push'
];

export const NOTIFICATION_STATUSES = [
  'pending',
  'sent',
  'failed'
];

export const PACKAGE_TYPES = [
  'box',
  'bag',
  'envelope',
  'pallet',
  'other'
];