
import Order from '../models/order.model.js';
import Delivery from '../models/delivery.model.js';
import User from '../models/user.model.js';
import Depot from '../models/depot.model.js';

function round(value, decimals = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

function moneyByCurrency(rows) {
  return Object.fromEntries(
    rows.map(row => [
      row._id || 'ARS',
      round(row.total ?? 0)
    ])
  );
}

function buildDailySeries(days, from, orders, deliveries) {
  const orderMap = new Map(
    orders.map(item => [item._id, item.count])
  );

  const deliveryMap = new Map(
    deliveries.map(item => [item._id, item.count])
  );

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(
      from.getTime() + index * 86400000
    ).toISOString().slice(0, 10);

    return {
      date,
      orders: orderMap.get(date) ?? 0,
      deliveriesCompleted: deliveryMap.get(date) ?? 0
    };
  });
}

export const analyticsService = {
  async getDashboard(days = 14) {
    const now = new Date();

    const today = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    const from = new Date(
      today.getTime() - (days - 1) * 86400000
    );

    const [
      ordersTotal,
      ordersToday,
      ordersActive,
      ordersInTransit,
      ordersDelivered,
      ordersCancelled,
      deliveriesTotal,
      deliveriesActive,
      deliveriesInTransit,
      deliveriesDelivered,
      driversActive,
      depotsActive,
      shippingRevenue,
      deliveryCosts,
      deliveryDuration,
      dailyOrders,
      dailyDeliveries,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments({}),

      Order.countDocuments({
        createdAt: { $gte: today }
      }),

      Order.countDocuments({
        status: {
          $in: ['created', 'assigned', 'picked_up', 'in_transit']
        }
      }),

      Order.countDocuments({ status: 'in_transit' }),

      Order.countDocuments({ status: 'delivered' }),

      Order.countDocuments({ status: 'cancelled' }),

      Delivery.countDocuments({}),

      Delivery.countDocuments({
        status: { $in: ['pending', 'assigned', 'in_transit'] }
      }),

      Delivery.countDocuments({ status: 'in_transit' }),

      Delivery.countDocuments({ status: 'delivered' }),

      User.countDocuments({
        role: 'driver',
        active: true
      }),

      Depot.countDocuments({ active: true }),

      Order.aggregate([
        {
          $match: {
            'shippingCost.total': { $gte: 0 }
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$shippingCost.currency', 'ARS']
            },
            total: { $sum: '$shippingCost.total' }
          }
        }
      ]),

      Delivery.aggregate([
        {
          $match: {
            'costs.totalActualCost': { $gte: 0 }
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$costs.currency', 'ARS']
            },
            total: { $sum: '$costs.totalActualCost' }
          }
        }
      ]),

      Delivery.aggregate([
        {
          $match: {
            status: 'delivered',
            assignedAt: { $type: 'date' },
            deliveredAt: { $type: 'date' }
          }
        },
        {
          $project: {
            milliseconds: {
              $subtract: ['$deliveredAt', '$assignedAt']
            }
          }
        },
        {
          $match: {
            milliseconds: { $gte: 0 }
          }
        },
        {
          $group: {
            _id: null,
            averageMilliseconds: { $avg: '$milliseconds' }
          }
        }
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'UTC'
              }
            },
            count: { $sum: 1 }
          }
        }
      ]),

      Delivery.aggregate([
        {
          $match: {
            status: 'delivered',
            deliveredAt: { $gte: from }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$deliveredAt',
                timezone: 'UTC'
              }
            },
            count: { $sum: 1 }
          }
        }
      ]),

      Order.find()
        .select('_id trackingCode status priority createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean()
    ]);

    const finishedOrders = ordersDelivered + ordersCancelled;

    const deliveryRate = finishedOrders > 0
      ? round(ordersDelivered / finishedOrders * 100)
      : null;

    const averageDeliveryMinutes = deliveryDuration.length
      ? round(deliveryDuration[0].averageMilliseconds / 60000)
      : null;

    return {
      generatedAt: now.toISOString(),

      period: {
        days,
        from: from.toISOString(),
        to: now.toISOString(),
        timezone: 'UTC'
      },

      overview: {
        ordersTotal,
        ordersToday,
        ordersActive,
        ordersInTransit,
        ordersDelivered,
        ordersCancelled,
        deliveriesTotal,
        deliveriesActive,
        deliveriesInTransit,
        deliveriesDelivered,
        driversActive,
        depotsActive,
        deliveryRate,
        averageDeliveryMinutes
      },

      finances: {
        shippingRevenueByCurrency: moneyByCurrency(shippingRevenue),
        deliveryCostsByCurrency: moneyByCurrency(deliveryCosts)
      },

      activity: {
        daily: buildDailySeries(
          days,
          from,
          dailyOrders,
          dailyDeliveries
        ),

        recentOrders: recentOrders.map(order => ({
          id: String(order._id),
          trackingCode: order.trackingCode ?? null,
          status: order.status,
          priority: order.priority,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }))
      }
    };
  }
};
