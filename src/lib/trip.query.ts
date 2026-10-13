import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { searchPlaces } from './places'
import { RouteError, fetchRoute } from './routing'
import type { LngLat } from './geo'

/** ~10 m: GPS jitter at the start point shouldn't fetch a new route. */
const routeKey = (p: LngLat | null) => p && `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`

export function routeQueryOptions(from: LngLat | null, to: LngLat | null) {
  return queryOptions({
    queryKey: ['route', routeKey(from), routeKey(to)],
    queryFn: ({ signal }) => fetchRoute(from!, to!, signal),
    enabled: from != null && to != null,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    // The indexed line holds typed arrays; keep the instance as-is.
    structuralSharing: false,
    retry: (count, error) =>
      !(error instanceof RouteError && error.reason === 'no_route') && count < 2,
  })
}

export function placesQueryOptions(query: string, locale: string, near: LngLat | null) {
  const q = query.trim()
  const nearKey = near && `${near.lat.toFixed(1)},${near.lng.toFixed(1)}`
  return queryOptions({
    queryKey: ['places', q.toLowerCase(), locale, nearKey],
    queryFn: ({ signal }) => searchPlaces(q, { locale, near }, signal),
    enabled: q.length >= 2,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}
