
import mongoose from 'mongoose';

import {
  DOCUMENT_TYPES,
  DRIVER_AVAILABILITY_STATUSES,
  USER_ROLES,
  VEHICLE_TYPES
} from '../constants/logistics.constants.js';

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  number: { type: String, trim: true },
  neighborhood: { type: String, trim: true },
  city: { type: String, trim: true },
  province: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: {
    type: String,
    trim: true,
    default: 'Argentina'
  },
  floor: { type: String, trim: true },
  unit: { type: String, trim: true },
  tower: { type: String, trim: true },
  reference: { type: String, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 }
}, { _id: false });

const driverProfileSchema = new mongoose.Schema({
  licenseNumber: { type: String, trim: true },
  licenseExpiresAt: {
    type: Date,
    default: null
  },
  vehicleType: {
    type: String,
    enum: VEHICLE_TYPES,
    default: null
  },
  vehiclePlate: {
    type: String,
    trim: true,
    uppercase: true
  },
  vehicleDescription: { type: String, trim: true },
  maxWeightKg: {
    type: Number,
    min: 0,
    default: null
  },
  availabilityStatus: {
    type: String,
    enum: DRIVER_AVAILABILITY_STATUSES,
    default: 'offline'
  }
}, { _id: false });

const notificationPreferencesSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: false },
  sms: { type: Boolean, default: false },
  push: { type: Boolean, default: true }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  generatedName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    select: false
  },
  role: {
    type: String,
    enum: USER_ROLES,
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  alternatePhone: {
    type: String,
    trim: true,
    default: null
  },
  documentType: {
    type: String,
    enum: DOCUMENT_TYPES,
    default: null
  },
  documentNumber: {
    type: String,
    trim: true,
    default: null
  },
  companyName: {
    type: String,
    trim: true,
    default: null
  },
  address: {
    type: addressSchema,
    default: null
  },
  driverProfile: {
    type: driverProfileSchema,
    default: null
  },
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({})
  },
  documents: {
    type: [documentSchema],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const removeSensitiveFields = (_doc, ret) => {
  delete ret.password;
  return ret;
};

userSchema.set('toJSON', {
  transform: removeSensitiveFields
});

userSchema.set('toObject', {
  transform: removeSensitiveFields
});

userSchema.index({
  role: 1,
  active: 1
});

userSchema.index({
  phone: 1
});

const User = mongoose.model('User', userSchema);

export default User;
