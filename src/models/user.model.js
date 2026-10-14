import mongoose from 'mongoose';

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
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: [true, 'La contrasena es obligatoria'],
        select: false
    },

    role: {
        type: String,
        enum: ['admin', 'customer', 'driver', 'store'],
        default: 'customer'
    },

    documents: {
        type: [
            {
                documentType: {
                    type: String,
                    enum: [
                        'dni',
                        'licencia_conducir',
                        'comprobante_domicilio',
                        'otro'
                    ]
                },
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
                    type: Date,
                    default: Date.now
                }
            }
        ],
        default: []
    }
}, {
    timestamps: true,

    toJSON: {
        transform: (_doc, ret) => {
            delete ret.password;
            return ret;
        }
    },

    toObject: {
        transform: (_doc, ret) => {
            delete ret.password;
            return ret;
        }
    }
});

const User = mongoose.model('User', userSchema);

export default User;