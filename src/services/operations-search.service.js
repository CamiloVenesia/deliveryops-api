
import mongoose from 'mongoose';

import Order from '../models/order.model.js';
import Delivery from '../models/delivery.model.js';

import {
    ORDER_STATUSES,
    DELIVERY_STATUSES,
    PRIORITY_LEVELS
} from '../constants/logistics.constants.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

function validationError(message) {
    throw new customError(ERROR_CODES.VALIDATION_ERROR, message);
}

function readString(value, name) {
    if (value == null || value === '') return '';

    if (typeof value !== 'string') {
        validationError(`El parámetro ${name} debe ser texto.`);
    }

    return value.trim();
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pageNumber(value, fallback, maximum) {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        return fallback;
    }

    return Math.min(parsed, maximum);
}

function parseDate(value, name) {
    const text = readString(value, name);

    if (!text) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        validationError(`${name} debe tener formato AAAA-MM-DD.`);
    }

    const date = new Date(`${text}T00:00:00.000Z`);

    if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== text
    ) {
        validationError(`La fecha ${name} no es válida.`);
    }

    return date;
}

function readFilters(query, statuses) {
    const q = readString(query.q, 'q');
    const status = readString(query.status, 'status');
    const priority = readString(query.priority, 'priority');
    const sort = readString(query.sort, 'sort') || 'newest';

    if (q.length > 120) {
        validationError('La búsqueda no puede superar los 120 caracteres.');
    }

    if (status && !statuses.includes(status)) {
        validationError('El estado seleccionado no es válido.');
    }

    if (priority && !PRIORITY_LEVELS.includes(priority)) {
        validationError('La prioridad seleccionada no es válida.');
    }

    if (!['newest', 'oldest'].includes(sort)) {
        validationError('El orden seleccionado no es válido.');
    }

    const from = parseDate(query.from, 'desde');
    const to = parseDate(query.to, 'hasta');

    if (from && to && from.getTime() > to.getTime()) {
        validationError('La fecha inicial debe ser anterior o igual a la final.');
    }

    const dateRange = {};

    if (from) {
        dateRange.$gte = from;
    }

    if (to) {
        const exclusiveEnd = new Date(to);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        dateRange.$lt = exclusiveEnd;
    }

    return {
        q,
        status,
        priority,
        sort,
        page: pageNumber(query.page, 1, 1000000),
        limit: pageNumber(query.limit, 10, 50),
        dateRange
    };
}

function applyCommonFilters(filter, options) {
    if (options.status) {
        filter.status = options.status;
    }

    if (options.priority) {
        filter.priority = options.priority;
    }

    if (Object.keys(options.dateRange).length > 0) {
        filter.createdAt = options.dateRange;
    }
}

function orderSearchConditions(q) {
    const expression = new RegExp(escapeRegex(q), 'i');

    const conditions = [
        { trackingCode: expression },
        { deliveryAddress: expression },
        { 'recipient.fullName': expression },
        { 'recipient.email': expression },
        { 'recipient.phone': expression },
        { 'items.name': expression }
    ];

    if (mongoose.isValidObjectId(q)) {
        conditions.push({
            _id: new mongoose.Types.ObjectId(q)
        });
    }

    return conditions;
}

async function searchMatchingOrderIds(q, actor) {
    const filter = {
        $or: orderSearchConditions(q)
    };

    if (actor.role === 'customer') {
        filter.customer = actor.id;
    }

    return Order.distinct('_id', filter);
}

async function paginate(Model, filter, options) {
    const direction = options.sort === 'oldest' ? 1 : -1;

    const [items, total] = await Promise.all([
        Model.find(filter)
            .sort({
                createdAt: direction,
                _id: direction
            })
            .skip((options.page - 1) * options.limit)
            .limit(options.limit)
            .exec(),

        Model.countDocuments(filter)
    ]);

    return {
        items,
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit)
    };
}

export const operationsSearchService = {
    async orders(query = {}, actor) {
        if (!['admin', 'customer'].includes(actor.role)) {
            throw new customError(ERROR_CODES.FORBIDDEN);
        }

        const options = readFilters(query, ORDER_STATUSES);
        const filter = {};

        if (actor.role === 'customer') {
            filter.customer = actor.id;
        }

        applyCommonFilters(filter, options);

        if (options.q) {
            filter.$or = orderSearchConditions(options.q);
        }

        return paginate(Order, filter, options);
    },

    async deliveries(query = {}, actor) {
        if (!['admin', 'customer', 'driver'].includes(actor.role)) {
            throw new customError(ERROR_CODES.FORBIDDEN);
        }

        const options = readFilters(query, DELIVERY_STATUSES);
        const filter = {};

        if (actor.role === 'driver') {
            filter.driver = actor.id;
        }

        if (actor.role === 'customer') {
            filter.order = {
                $in: await Order.distinct('_id', {
                    customer: actor.id
                })
            };
        }

        applyCommonFilters(filter, options);

        if (options.q) {
            const expression = new RegExp(
                escapeRegex(options.q),
                'i'
            );

            const matchedOrders = await searchMatchingOrderIds(
                options.q,
                actor
            );

            const conditions = [
                { trackingCode: expression },
                { order: { $in: matchedOrders } }
            ];

            if (mongoose.isValidObjectId(options.q)) {
                const id = new mongoose.Types.ObjectId(options.q);

                conditions.push({ _id: id });
                conditions.push({ order: id });
            }

            filter.$or = conditions;
        }

        return paginate(Delivery, filter, options);
    }
};
