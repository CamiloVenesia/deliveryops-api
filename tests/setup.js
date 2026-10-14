// tests/setup.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import Product from '../src/models/product.model.js';
import AuthSession from '../src/models/auth-session.model.js';

dotenv.config();

process.env.PORT ??=
    '3000';

process.env.MONGO_URL ??=
    'mongodb://localhost:27017/deliveryops-test';

process.env.MONGO_URL_TEST ??=
    'mongodb://localhost:27017/deliveryops-test';

process.env.BASIC_AUTH_USER ??=
    'deliveryops-test';

process.env.BASIC_AUTH_PASSWORD ??=
    'deliveryops-test-password';

process.env.JWT_ACCESS_SECRET ??=
    'deliveryops-test-access-secret-only-for-automated-tests';

process.env.JWT_REFRESH_SECRET ??=
    'deliveryops-test-refresh-secret-only-for-automated-tests';

process.env.JWT_ACCESS_EXPIRES_IN ??=
    '15m';

process.env.JWT_REFRESH_EXPIRES_IN ??=
    '7d';

const TEST_MONGO_URI =
    process.env.MONGO_URL_TEST;

before(async () => {
    await mongoose.connect(
        TEST_MONGO_URI
    );
});

beforeEach(async () => {
    await AuthSession.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Delivery.deleteMany({});
    await Product.deleteMany({});
});

after(async () => {
    await AuthSession.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Delivery.deleteMany({});
    await Product.deleteMany({});

    await mongoose.disconnect();
});