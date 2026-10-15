export const ORDER_STATUSES =
    Object.freeze([
        'created',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled'
    ]);

export const DELIVERY_STATUSES =
    Object.freeze([
        'pending',
        'assigned',
        'in_transit',
        'delivered',
        'cancelled'
    ]);

export const ORDER_STATUS_TRANSITIONS =
    Object.freeze({
        created: [
            'assigned',
            'cancelled'
        ],

        assigned: [
            'picked_up',
            'in_transit',
            'cancelled'
        ],

        picked_up: [
            'in_transit',
            'cancelled'
        ],

        in_transit: [
            'delivered',
            'cancelled'
        ],

        delivered: [],

        cancelled: []
    });

export const DELIVERY_STATUS_TRANSITIONS =
    Object.freeze({
        pending: [
            'assigned',
            'cancelled'
        ],

        assigned: [
            'in_transit',
            'cancelled'
        ],

        in_transit: [
            'delivered',
            'cancelled'
        ],

        delivered: [],

        cancelled: []
    });

export const DELIVERY_TO_ORDER_STATUS =
    Object.freeze({
        assigned:
            'assigned',

        in_transit:
            'in_transit',

        delivered:
            'delivered',

        cancelled:
            'cancelled'
    });

export const ORDER_TO_DELIVERY_STATUS =
    Object.freeze({
        assigned:
            'assigned',

        in_transit:
            'in_transit',

        delivered:
            'delivered',

        cancelled:
            'cancelled'
    });