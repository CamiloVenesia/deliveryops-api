
import mongoose from 'mongoose';

import Delivery from '../models/delivery.model.js';
import User from '../models/user.model.js';
import Depot from '../models/depot.model.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const ACTIVE_STATUSES = ['assigned', 'in_transit'];
const MAX_STOPS = 10;
const MAX_GEOMETRY_POINTS = 6000;
const TIMEOUT_MS = 9000;

function coordinate(value) {
    if (
        !value ||
        value.latitude == null ||
        value.longitude == null
    ) {
        return null;
    }

    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return null;
    }

    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

function number(value, factor = 1) {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0
    ) {
        throw new Error(
            'El proveedor devolvió una distancia o duración inválida'
        );
    }

    return Math.round(value * factor * 10) / 10;
}

function baseUrl() {
    const configured =
        process.env.ROUTING_OSRM_BASE_URL?.trim();

    const url = configured || (
        process.env.NODE_ENV === 'production'
            ? ''
            : 'https://router.project-osrm.org'
    );

    if (!url) return null;

    const parsed = new URL(url);

    if (
        parsed.protocol !== 'https:' ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
    ) {
        throw new Error(
            'ROUTING_OSRM_BASE_URL debe ser una URL HTTPS sin credenciales'
        );
    }

    return parsed.href.replace(/\/+$/, '');
}

function geometryPoints(route) {
    const raw = route?.geometry?.coordinates;

    if (
        !Array.isArray(raw) ||
        raw.length < 2 ||
        raw.length > MAX_GEOMETRY_POINTS
    ) {
        throw new Error(
            'El proveedor no devolvió una geometría válida'
        );
    }

    return raw.map(pair => {
        if (
            !Array.isArray(pair) ||
            pair.length < 2
        ) {
            throw new Error('Coordenadas inválidas');
        }

        const point = coordinate({
            latitude: pair[1],
            longitude: pair[0]
        });

        if (!point) {
            throw new Error('Coordenadas inválidas');
        }

        return point;
    });
}

async function requestRoadRoute(origin, stops) {
    const url = baseUrl();

    if (!url) {
        return { kind: 'not_configured' };
    }

    const points = [
        origin,
        ...stops.map(stop => stop.destination)
    ];

    const coordinates = points
        .map(point =>
            `${point.longitude},${point.latitude}`
        )
        .join(';');

    const multipleStops = stops.length > 1;
    const path = multipleStops ? 'trip' : 'route';

    const params = new URLSearchParams({
        geometries: 'geojson',
        overview: 'full',
        steps: 'false'
    });

    if (multipleStops) {
        params.set('roundtrip', 'false');
        params.set('source', 'first');
        params.set('destination', 'any');
    }

    try {
        const response = await fetch(
            `${url}/${path}/v1/driving/${coordinates}?${params}`,
            {
                signal: AbortSignal.timeout(TIMEOUT_MS)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Servicio de rutas HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (result?.code !== 'Ok') {
            throw new Error(
                'El proveedor no pudo calcular el recorrido'
            );
        }

        const route = multipleStops
            ? result.trips?.[0]
            : result.routes?.[0];

        if (
            !route ||
            !Array.isArray(route.legs) ||
            route.legs.length !== stops.length
        ) {
            throw new Error('Ruta incompleta');
        }

        let sortedStops = stops;

        if (multipleStops) {
            const waypoints = result.waypoints;

            if (
                !Array.isArray(waypoints) ||
                waypoints.length !== points.length ||
                waypoints[0]?.waypoint_index !== 0
            ) {
                throw new Error(
                    'Orden de paradas inválido'
                );
            }

            const ordered = stops
                .map((stop, index) => ({
                    ...stop,
                    sequence:
                        waypoints[index + 1]?.waypoint_index
                }))
                .sort(
                    (a, b) => a.sequence - b.sequence
                );

            if (
                ordered.some(
                    (stop, index) =>
                        stop.sequence !== index + 1
                )
            ) {
                throw new Error(
                    'Orden de paradas incompleto'
                );
            }

            sortedStops = ordered;
        }

        let elapsedSeconds = 0;

        const ordered = sortedStops.map(
            (stop, index) => {
                const leg = route.legs[index];

                elapsedSeconds += leg.duration;

                return {
                    ...stop,
                    sequence: index + 1,
                    distanceFromPreviousKm:
                        number(leg.distance / 1000),
                    minutesFromPrevious:
                        number(leg.duration / 60),
                    arrivalMinutesFromStart:
                        number(elapsedSeconds / 60)
                };
            }
        );

        return {
            kind: 'ready',
            stops: ordered,
            route: {
                distanceKm:
                    number(route.distance / 1000),
                estimatedDurationMinutes:
                    number(route.duration / 60),
                geometry: geometryPoints(route),
                calculatedAt:
                    new Date().toISOString(),
                provider: 'osrm',
                includesLiveTraffic: false
            }
        };
    } catch {
        return {
            kind: 'provider_unavailable'
        };
    }
}

export const routePlanningService = {
    async preview(driverId, actor) {
        if (!mongoose.isValidObjectId(driverId)) {
            throw new customError(
                ERROR_CODES.VALIDATION_ERROR,
                'ID de repartidor inválido'
            );
        }

        if (
            actor.role !== 'admin' &&
            (
                actor.role !== 'driver' ||
                actor.id !== driverId
            )
        ) {
            throw new customError(
                ERROR_CODES.FORBIDDEN
            );
        }

        const driver = await User.findById(
            driverId
        ).select('firstName lastName role');

        if (!driver || driver.role !== 'driver') {
            throw new customError(
                ERROR_CODES.USER_NOT_FOUND,
                'Repartidor no encontrado'
            );
        }

        const deliveries = await Delivery.find({
            driver: driverId,
            status: {
                $in: ACTIVE_STATUSES
            }
        })
            .sort({ createdAt: 1 })
            .limit(51)
            .populate(
                'order',
                'trackingCode deliveryAddressDetails deliveryAddress originDepot'
            )
            .lean();

        const result = {
            driver: {
                id: driver.id,
                name: [
                    driver.firstName,
                    driver.lastName
                ].filter(Boolean).join(' ')
            },
            status: 'empty',
            start: null,
            stops: [],
            missingCoordinates: [],
            excludedByLimit: 0,
            route: null,
            message:
                'No hay entregas activas para este repartidor.'
        };

        if (!deliveries.length) {
            return result;
        }

        const allWithDestination = [];

        for (const delivery of deliveries) {
            const destination =
                coordinate(
                    delivery.order?.deliveryAddressDetails
                ) ||
                coordinate(
                    delivery.route?.destination
                );

            const item = {
                deliveryId: String(delivery._id),
                orderId:
                    delivery.order?._id
                        ? String(delivery.order._id)
                        : null,
                trackingCode:
                    delivery.order?.trackingCode ||
                    delivery.trackingCode ||
                    String(delivery._id).slice(-8),
                status: delivery.status,
                priority: delivery.priority,
                address:
                    delivery.order?.deliveryAddress ||
                    null
            };

            if (destination) {
                allWithDestination.push({
                    ...item,
                    destination
                });
            } else {
                result.missingCoordinates.push(item);
            }
        }

        result.excludedByLimit =
            Math.max(
                0,
                allWithDestination.length - MAX_STOPS
            ) +
            (deliveries.length === 51 ? 1 : 0);

        result.stops = allWithDestination.slice(
            0,
            MAX_STOPS
        );

        const gpsDelivery = [...deliveries]
            .reverse()
            .find(
                item => coordinate(
                    item.currentLocation
                )
            );

        const gpsOrigin = coordinate(
            gpsDelivery?.currentLocation
        );

        if (gpsOrigin) {
            result.start = {
                ...gpsOrigin,
                source: 'gps'
            };
        } else {
            const routeStart = deliveries.find(
                item => coordinate(
                    item.route?.origin
                )
            );

            const routeOrigin = coordinate(
                routeStart?.route?.origin
            );

            if (routeOrigin) {
                result.start = {
                    ...routeOrigin,
                    source: 'route_origin'
                };
            }
        }

        if (!result.start) {
            const withDepot = deliveries.find(
                item =>
                    item.originDepot ||
                    item.order?.originDepot
            );

            const id =
                withDepot?.originDepot ||
                withDepot?.order?.originDepot;

            if (id) {
                const depot = await Depot.findById(
                    id
                )
                    .select('name address')
                    .lean();

                const point = coordinate(
                    depot?.address
                );

                if (point) {
                    result.start = {
                        ...point,
                        source: 'depot',
                        name: depot.name
                    };
                }
            }
        }

        if (
            !result.start ||
            !result.stops.length
        ) {
            result.status = 'needs_coordinates';

            result.message = !result.start
                ? 'Faltan coordenadas GPS de origen o del depósito.'
                : 'Las entregas activas no tienen coordenadas de destino.';

            return result;
        }

        const computed = await requestRoadRoute(
            result.start,
            result.stops
        );

        result.status = computed.kind;

        if (computed.kind === 'ready') {
            result.stops = computed.stops;
            result.route = computed.route;

            result.message =
                'Ruta de calles calculada con orden de paradas optimizado.';
        } else if (
            computed.kind === 'not_configured'
        ) {
            result.message =
                'Configurá ROUTING_OSRM_BASE_URL en el servidor para calcular rutas.';
        } else {
            result.message =
                'El motor de rutas no respondió; no se muestran distancias ni ETA estimados.';
        }

        return result;
    }
};
