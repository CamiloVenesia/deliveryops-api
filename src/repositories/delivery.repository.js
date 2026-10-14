// src/repositories/delivery.repository.js

import Delivery from '../models/delivery.model.js';

export const deliveryRepository = {

    async findAll({
        skip,
        limit,
        filter = {}
    }) {
        return await Delivery
            .find(filter)
            .skip(skip)
            .limit(limit);
    },

    async count(filter = {}) {
        return await Delivery.countDocuments(
            filter
        );
    },

    async findById(did) {
        return await Delivery.findById(
            did
        );
    },

    async create(data) {
        return await Delivery.create(
            data
        );
    },

    async deleteById(did) {
        return await Delivery.findByIdAndDelete(
            did
        );
    },

    async save(deliveryDoc) {
        return await deliveryDoc.save();
    }
};