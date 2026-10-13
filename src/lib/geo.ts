export interface LngLat {
  lng: number
  lat: number
}

export type Bounds = [[number, number], [number, number]]

const EARTH_RADIUS_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle (straight-line) distance in kilometres. */
export function distanceKm(a: LngLat, b: LngLat) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial compass bearing from `a` to `b`, 0–360° (0 = north). */
export function bearingDeg(a: LngLat, b: LngLat) {
  const dLng = rad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Smallest absolute difference between two bearings, 0–180°. */
export function angleDiff(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export function boundsOf(points: Iterable<LngLat>): Bounds | null {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of points) {
    minLng = Math.min(minLng, p.lng)
    minLat = Math.min(minLat, p.lat)
    maxLng = Math.max(maxLng, p.lng)
    maxLat = Math.max(maxLat, p.lat)
  }
  return Number.isFinite(minLng)
    ? [
        [minLng, minLat],
        [maxLng, maxLat],
      ]
    : null
}

export function inBounds(p: LngLat, b: Bounds) {
  return p.lng >= b[0][0] && p.lng <= b[1][0] && p.lat >= b[0][1] && p.lat <= b[1][1]
}

/** "46.81390,-71.20820" — compact and readable in URLs. */
export function formatLatLng({ lat, lng }: LngLat) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

export function parseLatLng(value: string | undefined): LngLat | null {
  const match = value?.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lng, lat } : null
}

const KM_PER_DEG = (Math.PI * EARTH_RADIUS_KM) / 180
/** Vertices per bounding box when indexing a route. */
const CHUNK = 32

interface Chunk {
  /** Index of the first vertex; the chunk covers segments start … end - 1. */
  start: number
  end: number
  bounds: Bounds
}

/** A route polyline prepared for repeated "how far from / along it" queries. */
export interface RouteLine {
  coords: ReadonlyArray<[number, number]>
  /** Distance travelled at each vertex, in km. */
  cumKm: Float64Array
  lengthKm: number
  bounds: Bounds
  chunks: Array<Chunk>
}

export interface RoutePosition {
  /** Straight-line distance to the nearest point of the route, in km. */
  offsetKm: number
  /** Distance travelled along the route to that point, in km. */
  alongKm: number
}

export function indexRoute(coords: ReadonlyArray<[number, number]>): RouteLine {
  const cumKm = new Float64Array(coords.length)
  for (let i = 1; i < coords.length; i++) {
    const [aLng, aLat] = coords[i - 1]
    const [bLng, bLat] = coords[i]
    cumKm[i] = cumKm[i - 1] + distanceKm({ lng: aLng, lat: aLat }, { lng: bLng, lat: bLat })
  }

  const chunks: Array<Chunk> = []
  for (let start = 0; start < coords.length - 1; start += CHUNK) {
    const end = Math.min(start + CHUNK, coords.length - 1)
    const bounds = boundsOf(
      coords.slice(start, end + 1).map(([lng, lat]) => ({ lng, lat })),
    )!
    chunks.push({ start, end, bounds })
  }

  return {
    coords,
    cumKm,
    lengthKm: cumKm[coords.length - 1] ?? 0,
    bounds: boundsOf(coords.map(([lng, lat]) => ({ lng, lat }))) ?? [
      [0, 0],
      [0, 0],
    ],
    chunks,
  }
}

/**
 * Where `p` sits relative to the route, or null when it is more than `maxKm`
 * from it. Uses a flat projection around `p`, accurate to well under 1 % at
 * the few-kilometre offsets that matter here.
 */
export function locateOnRoute(
  line: RouteLine,
  p: LngLat,
  maxKm: number,
): RoutePosition | null {
  const kx = KM_PER_DEG * Math.cos(rad(p.lat))
  const ky = KM_PER_DEG
  const padLng = maxKm / kx
  const padLat = maxKm / ky
  const near = (b: Bounds) =>
    p.lng >= b[0][0] - padLng &&
    p.lng <= b[1][0] + padLng &&
    p.lat >= b[0][1] - padLat &&
    p.lat <= b[1][1] + padLat

  if (!near(line.bounds)) return null

  let best: RoutePosition | null = null
  let bestSq = maxKm * maxKm + 1e-9
  for (const chunk of line.chunks) {
    if (!near(chunk.bounds)) continue
    for (let i = chunk.start; i < chunk.end; i++) {
      // Segment endpoints in km, relative to p.
      const ax = (line.coords[i][0] - p.lng) * kx
      const ay = (line.coords[i][1] - p.lat) * ky
      const dx = (line.coords[i + 1][0] - p.lng) * kx - ax
      const dy = (line.coords[i + 1][1] - p.lat) * ky - ay
      const lenSq = dx * dx + dy * dy
      const t = lenSq > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lenSq)) : 0
      const cx = ax + t * dx
      const cy = ay + t * dy
      const distSq = cx * cx + cy * cy
      // Strict, so a road driven twice resolves to the first pass.
      if (distSq < bestSq) {
        bestSq = distSq
        best = {
          offsetKm: Math.sqrt(distSq),
          alongKm: line.cumKm[i] + t * (line.cumKm[i + 1] - line.cumKm[i]),
        }
      }
    }
  }
  return best
}

export function formatDistance(km: number, locale: string) {
  if (km < 1) {
    const m = Math.max(10, Math.round((km * 1000) / 10) * 10)
    return `${new Intl.NumberFormat(locale).format(m)} m`
  }
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km)} km`
}
