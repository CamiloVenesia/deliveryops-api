import mongoose from 'mongoose';

const addressSchema =
  new mongoose.Schema(
    {
      street: {
        type: String,
        required: true,
        trim: true
      },

      number: {
        type: String,
        required: true,
        trim: true
      },

      neighborhood: {
        type: String,
        trim: true,
        default: null
      },

      city: {
        type: String,
        required: true,
        trim: true
      },

      province: {
        type: String,
        required: true,
        trim: true
      },

      postalCode: {
        type: String,
        trim: true,
        default: null
      },

      country: {
        type: String,
        trim: true,
        default: 'Argentina'
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

const contactSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        trim: true,
        default: null
      },

      email: {
        type: String,
        lowercase: true,
        trim: true,
        default: null
      },

      phone: {
        type: String,
        trim: true,
        default: null
      }
    },
    {
      _id: false
    }
  );

const operatingHoursSchema =
  new mongoose.Schema(
    {
      day: {
        type: Number,
        min: 0,
        max: 6,
        required: true
      },

      enabled: {
        type: Boolean,
        default: true
      },

      open: {
        type: String,
        default: '08:00'
      },

      close: {
        type: String,
        default: '18:00'
      }
    },
    {
      _id: false
    }
  );

const depotSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: [
          true,
          'El nombre del depósito es obligatorio'
        ],
        trim: true
      },

      code: {
        type: String,
        required: [
          true,
          'El código del depósito es obligatorio'
        ],
        unique: true,
        uppercase: true,
        trim: true
      },

      address: {
        type: addressSchema,
        required: true
      },

      contact: {
        type: contactSchema,
        default: null
      },

      operatingHours: {
        type: [operatingHoursSchema],
        default: []
      },

      serviceAreas: {
        type: [String],
        default: []
      },

      maxDailyDeliveries: {
        type: Number,
        min: 0,
        default: null
      },

      notes: {
        type: String,
        trim: true,
        default: null
      },

      active: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true
    }
  );

depotSchema.index({
  active: 1,
  name: 1
});

const Depot =
  mongoose.model(
    'Depot',
    depotSchema
  );

export default Depot;