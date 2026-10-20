
import { driversService } from './drivers.service.js';

function loadOf(driver) {
    const active = driver.metrics?.activeDeliveries ?? 0;

    return active / (
        driver.maxConcurrentDeliveries || 12
    );
}

export const dispatchRecommendationService = {
    async getCandidates(query = {}) {
        const q = String(query.q ?? '').trim();
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;

        // Reutilizamos la política de permisos y el cálculo del Bloque 10.
        const listing = await driversService.list({
            q,
            page,
            limit,
            days: 30
        });

        const candidates = listing.items
            .map(driver => ({
                ...driver,

                reason: !driver.active
                    ? 'Usuario desactivado'
                    : driver.declaredStatus === 'offline'
                        ? 'Fuera de servicio'
                        : driver.declaredStatus === 'busy'
                            ? 'Marcado como ocupado'
                            : driver.remainingCapacity === 0
                                ? 'Capacidad completa'
                                : 'Puede recibir nuevas entregas'
            }))
            .sort((a, b) =>
                Number(b.eligibleForAssignment) -
                    Number(a.eligibleForAssignment) ||
                loadOf(a) - loadOf(b) ||
                b.remainingCapacity - a.remainingCapacity ||
                `${a.firstName} ${a.lastName}`.localeCompare(
                    `${b.firstName} ${b.lastName}`,
                    'es'
                )
            );

        return {
            ...listing,
            items: candidates,

            eligibleOnPage: candidates.filter(
                item => item.eligibleForAssignment
            ).length,

            ordering: 'Disponibilidad y menor ocupación relativa',

            note: 'La recomendación no considera distancia, ubicación GPS ni tráfico.'
        };
    }
};
