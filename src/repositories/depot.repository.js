
import Depot from '../models/depot.model.js';

export const depotRepository = {
  findAll({ filter = {}, skip = 0, limit = 20 } = {}) {
    return Depot.find(filter)
      .sort({ name: 1, _id: 1 })
      .skip(skip)
      .limit(limit);
  },

  findById(id) {
    return Depot.findById(id);
  },

  findByCode(code) {
    return Depot.findOne({ code });
  },

  count(filter = {}) {
    return Depot.countDocuments(filter);
  },

  create(data) {
    return Depot.create(data);
  },

  save(depot) {
    return depot.save();
  },

  deleteById(id) {
    return Depot.findByIdAndDelete(id);
  }
};
