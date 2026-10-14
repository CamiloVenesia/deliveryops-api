// tests/setup.js

import mongoose from 'mongoose';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import Product from '../src/models/product.model.js';

import dotenv from 'dotenv';

dotenv.config();

const TEST_MONGO_URI =
    process.env.MONGO_URL_TEST ||
    'mongodb://localhost:27017/deliveryops-test';

before(async () => {
    await mongoose.connect(TEST_MONGO_URI);
});

beforeEach(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
    await Delivery.deleteMany({});
    await Product.deleteMany({});
});

after(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
    await Delivery.deleteMany({});
    await Product.deleteMany({});

    await mongoose.disconnect();
});