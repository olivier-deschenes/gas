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

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving/'

const tableSchema = z.object({
  code: z.string(),
  durations: z.array(z.array(z.number().nullable())).optional(),
})

/**
 * Extra driving minutes to stop at each of `stops` on the way from `from` to
 * `to`: (from → stop) + (stop → to) − (from → to), from one table request.
 * Null where OSRM can't route a leg.
 */
export async function fetchDetours(
  from: LngLat,
  to: LngLat,
  stops: ReadonlyArray<LngLat>,
  signal?: AbortSignal,
): Promise<Array<number | null>> {
  const n = stops.length
  const range = (start: number, count: number) =>
    Array.from({ length: count }, (_, i) => start + i).join(';')
  const url = new URL(`${OSRM_TABLE_URL}${[from, ...stops, to].map(point).join(';')}`)
  // Rows: the start, then each stop. Columns: each stop, then the destination.
  url.searchParams.set('sources', range(0, n + 1))
  url.searchParams.set('destinations', range(1, n + 1))
  url.searchParams.set('annotations', 'duration')

  const res = await fetch(url, { signal })
  const body = tableSchema.safeParse(await res.json().catch(() => null))
  const durations = body.success && body.data.code === 'Ok' ? body.data.durations : undefined
  if (!durations) throw new RouteError('failed')

  const direct = durations[0][n]
  return stops.map((_, k) => {
    const there = durations[0][k]
    const onward = durations[k + 1][n]
    if (direct == null || there == null || onward == null) return null
    return Math.max(0, there + onward - direct) / 60
  })
}
