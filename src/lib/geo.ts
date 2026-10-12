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

export function formatDistance(km: number, locale: string) {
  if (km < 1) {
    const m = Math.max(10, Math.round((km * 1000) / 10) * 10)
    return `${new Intl.NumberFormat(locale).format(m)} m`
  }
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km)} km`
}
