import { z } from 'zod'
import { indexRoute } from './geo'
import type { LngLat, RouteLine } from './geo'

/**
 * Project OSRM's public demo server: no key, CORS-enabled, fair use with no
 * uptime guarantee. Swapping providers only touches this file.
 */
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/'

export interface Route {
  line: RouteLine
  distanceKm: number
  durationMin: number
}

export class RouteError extends Error {
  constructor(readonly reason: 'no_route' | 'failed') {
    super(reason)
  }
}

const osrmSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number(),
        duration: z.number(),
        geometry: z.object({
          coordinates: z.array(z.tuple([z.number(), z.number()])),
        }),
      }),
    )
    .optional(),
})

const point = ({ lng, lat }: LngLat) => `${lng.toFixed(5)},${lat.toFixed(5)}`

export async function fetchRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route> {
  const url = new URL(`${OSRM_URL}${point(from)};${point(to)}`)
  url.searchParams.set('overview', 'full')
  url.searchParams.set('geometries', 'geojson')

  const res = await fetch(url, { signal })
  // OSRM answers 400 with a JSON body for unroutable pairs.
  const body = osrmSchema.safeParse(await res.json().catch(() => null))
  if (!body.success) throw new RouteError('failed')
  const route = body.data.routes?.[0]
  if (body.data.code !== 'Ok' || !route) {
    throw new RouteError(body.data.code === 'NoRoute' ? 'no_route' : 'failed')
  }

  return {
    line: indexRoute(route.geometry.coordinates),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  }
}
