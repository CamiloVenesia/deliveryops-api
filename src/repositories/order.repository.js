// src/repositories/order.repository.js

import Order from '../models/order.model.js';

export const orderRepository = {

    async findAll({
        skip,
        limit,
        filter = {}
    }) {
        return await Order
            .find(filter)
            .skip(skip)
            .limit(limit);
    },

    async count(filter = {}) {
        return await Order.countDocuments(
            filter
        );
    },

    async findById(oid) {
        return await Order.findById(
            oid
        );
    },

    async create(data) {
        return await Order.create(
            data
        );
    },

    async deleteById(oid) {
        return await Order.findByIdAndDelete(
            oid
        );
    },

    async save(orderDoc) {
        return await orderDoc.save();
    }
};