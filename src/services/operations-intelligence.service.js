
import Order from '../models/order.model.js';
import Delivery from '../models/delivery.model.js';

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE_DELIVERY_STATUSES = [
  'pending',
  'assigned',
  'in_transit'
];

const ACTIVE_ORDER_STATUSES = [
  'created',
  'assigned',
  'picked_up',
  'in_transit'
];

function round(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function deliveryAlert(delivery, type) {
  const isOverdue = type === 'overdue';

  return {
    id: String(delivery._id),
    type,
    severity: isOverdue ? 'critical' : 'warning',
    entity: 'delivery',
    trackingCode:
      delivery.trackingCode || String(delivery._id),
    status: delivery.status,
    priority: delivery.priority,
    estimatedDeliveryAt:
      delivery.estimatedDeliveryAt ?? null,
    lastUpdatedAt: delivery.updatedAt,
    orderId: delivery.order
      ? String(delivery.order)
      : null,
    title: isOverdue
      ? 'Entrega fuera de plazo'
      : 'Entrega sin actualizaciones',
    description: isOverdue
      ? 'Superó la fecha estimada y aún no fue completada.'
      : 'Sigue en tránsito y no registra actualizaciones desde hace más de 24 horas.'
  };
}

function orderAlert(order) {
  return {
    id: String(order._id),
    type: 'high_priority',
    severity: 'warning',
    entity: 'order',
    trackingCode:
      order.trackingCode || String(order._id),
    status: order.status,
    priority: order.priority,
    lastUpdatedAt: order.updatedAt,
    title: 'Pedido prioritario sin asignar',
    description:
      'Pedido de prioridad alta que todavía necesita asignación.'
  };
}

async function getDriverPerformance(from, now) {
  const rows = await Delivery.aggregate([
    {
      $match: {
        status: 'delivered',
        driver: { $type: 'objectId' },
        deliveredAt: {
          $gte: from,
          $lte: now
        }
      }
    },
    {
      $group: {
        _id: '$driver',
        completed: { $sum: 1 },
        withEstimate: {
          $sum: {
            $cond: [
              { $ne: ['$estimatedDeliveryAt', null] },
              1,
              0
            ]
          }
        },
        lateWithEstimate: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$estimatedDeliveryAt', null] },
                  {
                    $gt: [
                      '$deliveredAt',
                      '$estimatedDeliveryAt'
                    ]
                  }
                ]
              },
              1,
              0
            ]
          }
        },
        averageMinutes: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ['$assignedAt', null] },
                  {
                    $gte: [
                      '$deliveredAt',
                      '$assignedAt'
                    ]
                  }
                ]
              },
              {
                $divide: [
                  {
                    $subtract: [
                      '$deliveredAt',
                      '$assignedAt'
                    ]
                  },
                  60000
                ]
              },
              null
            ]
          }
        }
      }
    },
    {
      $sort: {
        completed: -1,
        _id: 1
      }
    },
    { $limit: 8 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driver'
      }
    },
    {
      $unwind: {
        path: '$driver',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        completed: 1,
        withEstimate: 1,
        lateWithEstimate: 1,
        averageMinutes: 1,
        firstName: '$driver.firstName',
        lastName: '$driver.lastName'
      }
    }
  ]);

  return rows.map((row) => {
    const name = [
      row.firstName,
      row.lastName
    ].filter(Boolean).join(' ');

    const onTimeRate = row.withEstimate > 0
      ? round(
        (row.withEstimate - row.lateWithEstimate) /
          row.withEstimate * 100
      )
      : null;

    return {
      driverId: String(row._id),
      name: name || 'Repartidor sin datos',
      completed: row.completed,
      averageDeliveryMinutes:
        round(row.averageMinutes),
      onTimeRate,
      evaluatedWithEstimate: row.withEstimate
    };
  });
}

export const operationsIntelligenceService = {
  async getOverview(days = 30) {
    const now = new Date();
    const from = new Date(
      now.getTime() - days * DAY
    );
    const staleThreshold = new Date(
      now.getTime() - DAY
    );
    const incidentsFrom = new Date(
      now.getTime() - 7 * DAY
    );

    // Una entrega atrasada necesita una fecha
    // estimada real: no inferimos un SLA.
    const overdueFilter = {
      status: {
        $in: ACTIVE_DELIVERY_STATUSES
      },
      estimatedDeliveryAt: {
        $type: 'date',
        $lt: now
      }
    };

    const staleFilter = {
      status: 'in_transit',
      updatedAt: {
        $lt: staleThreshold
      }
    };

    const highPriorityFilter = {
      status: {
        $in: ACTIVE_ORDER_STATUSES
      },
      priority: 'high'
    };

    const [
      overdue,
      staleInTransit,
      highPriorityOpen,
      unassignedOrders,
      incidentRows,
      overdueList,
      staleList,
      priorityList,
      drivers
    ] = await Promise.all([
      Delivery.countDocuments(overdueFilter),

      Delivery.countDocuments(staleFilter),

      Order.countDocuments(highPriorityFilter),

      Order.countDocuments({
        status: 'created'
      }),

      Delivery.aggregate([
        { $unwind: '$deliveryAttempts' },
        {
          $match: {
            'deliveryAttempts.attemptedAt': {
              $gte: incidentsFrom
            },
            'deliveryAttempts.outcome': {
              $nin: ['delivered']
            }
          }
        },
        {
          $count: 'total'
        }
      ]),

      Delivery.find(overdueFilter)
        .select(
          'trackingCode status priority estimatedDeliveryAt updatedAt order'
        )
        .sort({
          estimatedDeliveryAt: 1
        })
        .limit(8)
        .lean(),

      Delivery.find(staleFilter)
        .select(
          'trackingCode status priority estimatedDeliveryAt updatedAt order'
        )
        .sort({
          updatedAt: 1
        })
        .limit(8)
        .lean(),

      Order.find({
        status: 'created',
        priority: 'high'
      })
        .select(
          'trackingCode status priority updatedAt'
        )
        .sort({
          createdAt: 1
        })
        .limit(8)
        .lean(),

      getDriverPerformance(from, now)
    ]);

    // Una misma entrega puede estar atrasada y
    // sin actualización. No la duplicamos en la lista.
    const seen = new Set();
    const items = [];

    function include(alert) {
      const key = `${alert.entity}:${alert.id}`;

      if (!seen.has(key) && items.length < 12) {
        seen.add(key);
        items.push(alert);
      }
    }

    overdueList.forEach(item =>
      include(deliveryAlert(item, 'overdue'))
    );

    staleList.forEach(item =>
      include(deliveryAlert(item, 'stale'))
    );

    priorityList.forEach(item =>
      include(orderAlert(item))
    );

    return {
      generatedAt: now.toISOString(),
      period: {
        days,
        from: from.toISOString(),
        to: now.toISOString()
      },
      thresholds: {
        staleAfterHours: 24
      },
      alerts: {
        summary: {
          overdue,
          staleInTransit,
          highPriorityOpen,
          unassignedOrders,
          incidentsLast7Days:
            incidentRows[0]?.total ?? 0
        },
        items,
        // Los indicadores pueden superponerse.
        overlappingCategories: true
      },
      performance: {
        drivers
      }
    };
  }
};
