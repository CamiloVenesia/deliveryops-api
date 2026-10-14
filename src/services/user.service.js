// src/services/user.service.js

import bcrypt from 'bcrypt';

import { userRepository } from '../repositories/user.repository.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { ALLOWED_DOCUMENT_TYPES } from '../config/multer.config.js';
import logger from '../utils/logger.js';

const PASSWORD_SALT_ROUNDS = 10;

export const userService = {

    async getAll({ page = 1, limit = 10 } = {}) {
        const pageNum = Math.max(
            1,
            parseInt(page, 10) || 1
        );

        const limitNum = Math.min(
            50,
            Math.max(
                1,
                parseInt(limit, 10) || 10
            )
        );

        const [items, total] = await Promise.all([
            userRepository.findAll({
                skip: (pageNum - 1) * limitNum,
                limit: limitNum
            }),
            userRepository.count()
        ]);

        return {
            items,
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(
                total / limitNum
            )
        };
    },

    async getById(uid) {
        const user =
            await userRepository.findById(uid);

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        return user;
    },

    async create({
        firstName,
        lastName,
        email,
        password,
        role
    }) {
        if (
            !firstName ||
            !lastName ||
            !email ||
            !password
        ) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        if (role === 'admin') {
            throw new customError(
                ERROR_CODES.FORBIDDEN
            );
        }

        const existingUser =
            await userRepository.findByEmail(email);

        if (existingUser) {
            throw new customError(
                ERROR_CODES.USER_ALREADY_EXIST
            );
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                PASSWORD_SALT_ROUNDS
            );

        return await userRepository.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role || 'customer'
        });
    },

    async remove(uid) {
        const user =
            await userRepository.deleteById(uid);

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        return user;
    },

    async addDocument(
        uid,
        file,
        documentType
    ) {
        if (!file) {
            throw new customError(
                ERROR_CODES.FILE_REQUIRED,
                'Debe adjuntar un archivo (campo "document")'
            );
        }

        if (
            documentType &&
            !ALLOWED_DOCUMENT_TYPES.includes(
                documentType
            )
        ) {
            throw new customError(
                ERROR_CODES.INVALID_DOCUMENT_TYPE,
                `Tipo de documento inválido: ${documentType}`
            );
        }

        const user =
            await userRepository.findById(uid);

        if (!user) {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND
            );
        }

        user.documents.push({
            documentType:
                documentType || 'otro',
            originalName:
                file.originalname,
            generatedName:
                file.filename,
            path:
                file.path,
            mimetype:
                file.mimetype,
            size:
                file.size,
            uploadedAt:
                new Date()
        });

        await userRepository.save(user);

        logger.info(
            `Documento cargado para usuario ${uid}: ${file.originalname} (${documentType || 'otro'})`
        );

        return user;
    }
};