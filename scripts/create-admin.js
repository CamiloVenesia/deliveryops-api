import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import User from '../src/models/user.model.js';

const PASSWORD_SALT_ROUNDS = 10;

const rl = readline.createInterface({
    input,
    output
});

try {
    console.log('\n=== DeliveryOps · Crear administrador inicial ===\n');

    const firstName = (
        await rl.question('Nombre: ')
    ).trim();

    const lastName = (
        await rl.question('Apellido: ')
    ).trim();

    const email = (
        await rl.question('Email: ')
    )
        .trim()
        .toLowerCase();

    const password =
        await rl.question('Contraseña: ');

    if (
        !firstName ||
        !lastName ||
        !email ||
        !password
    ) {
        throw new Error(
            'Todos los campos son obligatorios.'
        );
    }

    if (password.length < 8) {
        throw new Error(
            'La contraseña debe tener al menos 8 caracteres.'
        );
    }

    if (!process.env.MONGO_URL) {
        throw new Error(
            'Falta MONGO_URL en el archivo .env.'
        );
    }

    await mongoose.connect(
        process.env.MONGO_URL
    );

    const existingUser =
        await User.findOne({
            email
        });

    if (existingUser) {
        if (
            existingUser.role ===
            'admin'
        ) {
            console.log(
                '\nEse usuario ya existe y ya es administrador.'
            );
        } else {
            console.log(
                `\nEl usuario ya existe con rol "${existingUser.role}". No se modificó automáticamente.`
            );
        }

        process.exitCode = 0;
    } else {
        const hashedPassword =
            await bcrypt.hash(
                password,
                PASSWORD_SALT_ROUNDS
            );

        const admin =
            await User.create({
                firstName,
                lastName,
                email,
                password:
                    hashedPassword,
                role:
                    'admin'
            });

        console.log(
            '\nAdministrador creado correctamente.'
        );

        console.log(
            `Email: ${admin.email}`
        );

        console.log(
            `Rol: ${admin.role}`
        );
    }
} catch (error) {
    console.error(
        `\nError: ${error.message}`
    );

    process.exitCode = 1;
} finally {
    rl.close();

    await mongoose
        .disconnect()
        .catch(() => {});
}