
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import User from '../src/models/user.model.js';
import Depot from '../src/models/depot.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

const DB_NAME = 'deliveryops-demo';
const DEMO_DOMAIN = 'deliveryops-demo.example.com';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const people = [
  ['admin', 'Valentina', 'Herrera', 'admin'],
  ['store', 'Federico', 'Romero', 'store'],
  ['driver1', 'Martín', 'Pérez', 'driver'],
  ['driver2', 'Lucía', 'Acosta', 'driver'],
  ['driver3', 'Santiago', 'Molina', 'driver'],
  ['driver4', 'Camila', 'Suárez', 'driver'],
  ['customer1', 'Florencia', 'López', 'customer'],
  ['customer2', 'Nicolás', 'Fernández', 'customer'],
  ['customer3', 'Julieta', 'Torres', 'customer'],
  ['customer4', 'Bruno', 'Gómez', 'customer'],
  ['customer5', 'Agustina', 'Ruiz', 'customer'],
  ['customer6', 'Tomás', 'Medina', 'customer']
];

const depots = [
  {
    code: 'DEMO-ROS-CENTRO',
    name: 'Centro de distribución Rosario',
    address: {
      street: 'San Martín',
      number: '1250',
      city: 'Rosario',
      province: 'Santa Fe',
      postalCode: '2000',
      latitude: -32.949,
      longitude: -60.636
    },
    contact: {
      name: 'Mesa de operaciones',
      email: `centro@${DEMO_DOMAIN}`,
      phone: '3415550100'
    },
    serviceAreas: ['Centro', 'Abasto', 'Pichincha'],
    maxDailyDeliveries: 120
  },
  {
    code: 'DEMO-ROS-NORTE',
    name: 'Sucursal Rosario Norte',
    address: {
      street: 'Av. Alberdi',
      number: '800',
      city: 'Rosario',
      province: 'Santa Fe',
      postalCode: '2000',
      latitude: -32.913,
      longitude: -60.686
    },
    contact: {
      name: 'Coordinación Norte',
      email: `norte@${DEMO_DOMAIN}`,
      phone: '3415550101'
    },
    serviceAreas: ['Arroyito', 'Alberdi', 'Fisherton'],
    maxDailyDeliveries: 80
  },
  {
    code: 'DEMO-FUNES',
    name: 'Base logística Funes',
    address: {
      street: 'Av. Illia',
      number: '1800',
      city: 'Funes',
      province: 'Santa Fe',
      postalCode: '2132',
      latitude: -32.914,
      longitude: -60.81
    },
    contact: {
      name: 'Operaciones Funes',
      email: `funes@${DEMO_DOMAIN}`,
      phone: '3415550102'
    },
    serviceAreas: ['Funes', 'Roldán'],
    maxDailyDeliveries: 50
  }
];

const destinations = [
  ['Córdoba', '1520', 'Centro', -32.944, -60.638],
  ['Mendoza', '2200', 'Centro', -32.954, -60.656],
  ['Bv. Oroño', '770', 'Pichincha', -32.939, -60.653],
  ['San Juan', '3100', 'Echesortu', -32.955, -60.679],
  ['Av. Pellegrini', '1800', 'Abasto', -32.958, -60.649],
  ['Salta', '950', 'Centro', -32.939, -60.633]
];

const catalog = [
  {
    name: 'Auriculares inalámbricos',
    sku: 'AUR-240',
    price: 38500,
    weightKg: 0.3
  },
  {
    name: 'Teclado mecánico',
    sku: 'TEC-180',
    price: 72500,
    weightKg: 0.9
  },
  {
    name: 'Cafetera de filtro',
    sku: 'CAF-410',
    price: 89900,
    weightKg: 2.2
  },
  {
    name: 'Mochila urbana',
    sku: 'MOC-330',
    price: 45900,
    weightKg: 0.8
  },
  {
    name: 'Lámpara de escritorio',
    sku: 'LAM-215',
    price: 26900,
    weightKg: 1.1
  },
  {
    name: 'Botella térmica',
    sku: 'BOT-120',
    price: 18900,
    weightKg: 0.6
  }
];

function dateAfter(base, hours) {
  return new Date(base.getTime() + hours * HOUR);
}

function history(states, base, actorId, source) {
  return states.map((to, index) => ({
    from: index ? states[index - 1] : null,
    to,
    changedBy: actorId,
    changedByRole: 'admin',
    source,
    changedAt: dateAfter(base, index === 0 ? 0 : index * 0.8)
  }));
}

function targetStatus(i) {
  return [
    'created',
    'created',
    'assigned',
    'assigned',
    'in_transit',
    'in_transit',
    'delivered',
    'delivered',
    'delivered',
    'cancelled'
  ][i % 10];
}

async function ensureUser(
  [key, firstName, lastName, role],
  passwordHash
) {
  const email = `${key}@${DEMO_DOMAIN}`;
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== role) {
      throw new Error(`Rol inconsistente para ${email}`);
    }
    return existing;
  }

  return User.create({
    firstName,
    lastName,
    email,
    password: passwordHash,
    role,
    active: true,
    phone: '3415550000',
    ...(role === 'driver'
      ? {
          driverProfile: {
            vehicleType: 'motorcycle',
            availabilityStatus: 'available'
          }
        }
      : {})
  });
}

async function ensureDepot(details) {
  return (
    (await Depot.findOne({ code: details.code })) ||
    Depot.create({ ...details, active: true })
  );
}

async function ensureOrder(
  i,
  customer,
  recipient,
  depot,
  admin
) {
  const trackingCode =
    `DOPS-DEMO-${String(i + 1).padStart(4, '0')}`;

  const existing = await Order.findOne({ trackingCode });

  if (existing) return existing;

  const base = new Date(
    Date.now() - ((i % 14) * DAY + 5 * HOUR)
  );

  const state = targetStatus(i);
  const steps = ['created'];

  if (['assigned', 'in_transit', 'delivered'].includes(state)) {
    steps.push('assigned');
  }

  if (['in_transit', 'delivered'].includes(state)) {
    steps.push('in_transit');
  }

  if (state === 'delivered') {
    steps.push('delivered');
  }

  if (state === 'cancelled') {
    steps.push('cancelled');
  }

  const item = catalog[i % catalog.length];
  const qty = 1 + (i % 3);

  const [
    street,
    number,
    neighborhood,
    latitude,
    longitude
  ] = destinations[i % destinations.length];

  const shippingTotal = 1800 + (i % 4) * 400;

  return Order.create({
    trackingCode,
    customer: customer._id,

    recipient: {
      fullName: `${recipient.firstName} ${recipient.lastName}`,
      email: recipient.email,
      phone: recipient.phone
    },

    items: [{
      ...item,
      quantity: qty,
      fragile: i % 5 === 0
    }],

    deliveryAddress: `${street} ${number}, Rosario, Santa Fe`,

    deliveryAddressDetails: {
      street,
      number,
      neighborhood,
      city: 'Rosario',
      province: 'Santa Fe',
      postalCode: '2000',
      latitude,
      longitude,
      ...(i % 4 === 0
        ? { floor: '4', unit: 'B' }
        : {})
    },

    deliveryInstructions:
      i % 3 === 0
        ? 'Llamar al llegar; entregar en recepción si está habilitada.'
        : 'Entregar al destinatario.',

    packageInfo: {
      packageCount: 1 + (i % 2),
      packageType: 'box',
      totalWeightKg: item.weightKg * qty,
      fragile: i % 5 === 0,
      requiresSignature: i % 4 === 0
    },

    originDepot: depot._id,

    priority:
      i % 5 === 0
        ? 'high'
        : i % 5 === 1
          ? 'low'
          : 'normal',

    shippingCost: {
      currency: 'ARS',
      baseCost: shippingTotal,
      total: shippingTotal
    },

    total: qty * item.price,
    status: state,
    statusHistory: history(steps, base, admin._id, 'system'),

    inTransitAt:
      ['in_transit', 'delivered'].includes(state)
        ? dateAfter(base, 1.6)
        : null,

    deliveredAt:
      state === 'delivered'
        ? dateAfter(base, 2.4)
        : null,

    cancelledAt:
      state === 'cancelled'
        ? dateAfter(base, 0.8)
        : null,

    sourceChannel: i % 2 ? 'web' : 'admin',
    createdAt: base,

    updatedAt:
      state === 'created'
        ? base
        : dateAfter(
            base,
            state === 'delivered' ? 2.4 : 1.6
          )
  });
}

async function ensureDelivery(
  i,
  order,
  driver,
  depot,
  admin
) {
  if (
    order.status === 'created' ||
    order.status === 'cancelled'
  ) {
    return null;
  }

  let delivery = await Delivery.findOne({
    order: order._id
  });

  if (!delivery) {
    const base = order.createdAt;
    const steps = ['assigned'];

    if (
      ['in_transit', 'delivered'].includes(order.status)
    ) {
      steps.push('in_transit');
    }

    if (order.status === 'delivered') {
      steps.push('delivered');
    }

    const state = order.status;
    const destination = order.deliveryAddressDetails;
    const isDelivered = state === 'delivered';

    delivery = await Delivery.create({
      trackingCode:
        `DOPD-DEMO-${String(i + 1).padStart(4, '0')}`,

      order: order._id,
      driver: driver._id,
      originDepot: depot._id,
      status: state,
      priority: order.priority,

      assignedAt: dateAfter(base, 0.5),

      inTransitAt:
        ['in_transit', 'delivered'].includes(state)
          ? dateAfter(base, 1.6)
          : null,

      deliveredAt:
        isDelivered
          ? dateAfter(base, 2.4)
          : null,

      statusHistory: history(
        steps,
        dateAfter(base, 0.5),
        admin._id,
        'system'
      ),

      vehicle: {
        type: 'motorcycle',
        description: 'Moto de reparto urbana'
      },

      route: {
        origin: {
          latitude: depot.address.latitude,
          longitude: depot.address.longitude
        },

        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude
        },

        distanceKm: 2.5 + (i % 6) * 1.4,
        estimatedDurationMinutes: 15 + (i % 6) * 6,
        calculatedAt: dateAfter(base, 0.5)
      },

      costs: {
        currency: 'ARS',
        plannedCost: 850 + (i % 3) * 120,
        fuelCost: isDelivered
          ? 500 + (i % 4) * 80
          : 0,
        totalActualCost: isDelivered
          ? 500 + (i % 4) * 80
          : 0
      },

      ...(state === 'in_transit' || isDelivered
        ? {
            currentLocation: {
              latitude: destination.latitude + 0.006,
              longitude: destination.longitude + 0.004
            },

            locationHistory: [
              {
                latitude: depot.address.latitude,
                longitude: depot.address.longitude,
                source: 'system',
                recordedAt: dateAfter(base, 1.6)
              },
              {
                latitude: destination.latitude + 0.006,
                longitude: destination.longitude + 0.004,
                source: 'system',
                recordedAt: dateAfter(base, 1.9)
              }
            ]
          }
        : {}),

      ...(isDelivered
        ? {
            proofOfDelivery: {
              receivedBy: order.recipient.fullName,
              relationship: 'Destinatario',
              notes: 'Entrega recibida correctamente',
              receivedAt: dateAfter(base, 2.4)
            }
          }
        : {}),

      createdAt: dateAfter(base, 0.5),

      updatedAt: dateAfter(
        base,
        isDelivered ? 2.4 : 1.9
      )
    });
  }

  if (
    !order.delivery ||
    String(order.delivery) !== String(delivery._id)
  ) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { delivery: delivery._id } }
    );
  }

  return delivery;
}

async function main() {
  if (process.env.NODE_ENV === 'test') {
    throw new Error(
      'No ejecutar el seed con NODE_ENV=test'
    );
  }

  if (!process.env.MONGO_URL) {
    throw new Error('Falta MONGO_URL');
  }

  if (
    !process.env.DEMO_PASSWORD ||
    process.env.DEMO_PASSWORD.length < 12
  ) {
    throw new Error(
      'Definí DEMO_PASSWORD con al menos 12 caracteres'
    );
  }

  await mongoose.connect(
    process.env.MONGO_URL,
    { serverSelectionTimeoutMS: 10000 }
  );

  if (mongoose.connection.name !== DB_NAME) {
    throw new Error(
      `Protección: conectado a "${mongoose.connection.name}". ` +
      `Se requiere la base "${DB_NAME}".`
    );
  }

  const hash = await bcrypt.hash(
    process.env.DEMO_PASSWORD,
    10
  );

  const users = {};

  for (const person of people) {
    users[person[0]] = await ensureUser(person, hash);
  }

  const depotDocs = [];

  for (const depot of depots) {
    depotDocs.push(await ensureDepot(depot));
  }

  for (let i = 0; i < 30; i++) {
    const customer =
      users[`customer${(i % 6) + 1}`];

    const recipient =
      users[`customer${((i + 1) % 6) + 1}`];

    const depot =
      depotDocs[i % depotDocs.length];

    const order = await ensureOrder(
      i,
      customer,
      recipient,
      depot,
      users.admin
    );

    const driver =
      users[`driver${(i % 4) + 1}`];

    await ensureDelivery(
      i,
      order,
      driver,
      depot,
      users.admin
    );
  }

  const [
    userCount,
    depotCount,
    orderCount,
    deliveryCount
  ] = await Promise.all([
    User.countDocuments({
      email: {
        $regex:
          `@${DEMO_DOMAIN.replaceAll('.', '\\.')}$`
      }
    }),

    Depot.countDocuments({
      code: /^DEMO-/
    }),

    Order.countDocuments({
      trackingCode: /^DOPS-DEMO-/
    }),

    Delivery.countDocuments({
      trackingCode: /^DOPD-DEMO-/
    })
  ]);

  console.log(
    `Demo lista: ${userCount} usuarios, ` +
    `${depotCount} depósitos, ` +
    `${orderCount} pedidos, ` +
    `${deliveryCount} entregas.`
  );

  console.log(
    `Acceso de administrador: admin@${DEMO_DOMAIN}`
  );

  console.log(
    'Contraseña: el valor configurado en DEMO_PASSWORD. ' +
    'No se modifica si el usuario ya existía.'
  );

  console.log(
    'Ejecución repetible: conserva registros demo existentes; no borra datos.'
  );
}

try {
  await main();
} catch (error) {
  console.error(
    `ERROR SEED DEMO: ${error.message}`
  );

  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
