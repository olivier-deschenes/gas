import { angleDiff, bearingDeg, boundsOf, distanceKm, inBounds } from './geo'
import type { Bounds, LngLat } from './geo'
import type { Fuel, Station } from './stations'

/** 0 = cheapest decile in its region … 4 = priciest decile. */
export type Tier = 0 | 1 | 2 | 3 | 4

export const TIERS: ReadonlyArray<Tier> = [0, 1, 2, 3, 4]

export interface RegionStat {
  region: string
  /** Stations in the region selling this fuel. */
  count: number
  min: number
  median: number
  max: number
  /** Every station tied at the regional minimum. */
  cheapestIds: Array<string>
  bounds: Bounds
}

export interface StationRank {
  /** 1 + number of stations in the region strictly cheaper (ties share a rank). */
  rank: number
  total: number
  tier: Tier
  regionCheapest: boolean
}

export interface FuelStats {
  fuel: Fuel
  /** Sorted by regional minimum, cheapest first. */
  regions: Array<RegionStat>
  byRegion: Map<string, RegionStat>
  ranks: Map<string, StationRank>
  province: { count: number; min: number; median: number; max: number } | null
}

export function median(sorted: ReadonlyArray<number>) {
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function tierFor(fractionCheaper: number): Tier {
  if (fractionCheaper < 0.1) return 0
  if (fractionCheaper < 0.3) return 1
  if (fractionCheaper < 0.7) return 2
  if (fractionCheaper < 0.9) return 3
  return 4
}

export function computeFuelStats(
  stations: ReadonlyArray<Station>,
  fuel: Fuel,
): FuelStats {
  const groups = new Map<string, Array<Station>>()
  const all: Array<number> = []
  for (const s of stations) {
    const price = s.prices[fuel]
    if (price == null) continue
    all.push(price)
    const group = groups.get(s.region)
    if (group) group.push(s)
    else groups.set(s.region, [s])
  }

  const ranks = new Map<string, StationRank>()
  const regions: Array<RegionStat> = []

  for (const [region, group] of groups) {
    group.sort((a, b) => a.prices[fuel]! - b.prices[fuel]!)
    const prices = group.map((s) => s.prices[fuel]!)
    const min = prices[0]

    let cheaper = 0
    for (let i = 0; i < group.length; i++) {
      if (i > 0 && prices[i] > prices[i - 1]) cheaper = i
      ranks.set(group[i].id, {
        rank: cheaper + 1,
        total: group.length,
        tier: tierFor(cheaper / group.length),
        regionCheapest: prices[i] === min,
      })
    }

    regions.push({
      region,
      count: group.length,
      min,
      median: median(prices),
      max: prices[prices.length - 1],
      cheapestIds: group.filter((s) => s.prices[fuel] === min).map((s) => s.id),
      bounds: boundsOf(group)!,
    })
  }

  regions.sort((a, b) => a.min - b.min || a.median - b.median)
  all.sort((a, b) => a - b)

  return {
    fuel,
    regions,
    byRegion: new Map(regions.map((r) => [r.region, r])),
    ranks,
    province: all.length
      ? { count: all.length, min: all[0], median: median(all), max: all[all.length - 1] }
      : null,
  }
}

export interface Candidate {
  station: Station
  price: number
  distanceKm: number | null
  ahead: boolean
}

export interface Nearby {
  candidates: Array<Candidate>
  /** Median price of every station considered (radius or viewport). */
  localMedian: number | null
  considered: number
}

/** Moving faster than ~11 km/h counts as driving for "ahead" ranking. */
const MOVING_MPS = 3
const AHEAD_CONE_DEG = 60

export function cheapestNear(
  stations: ReadonlyArray<Station>,
  fuel: Fuel,
  origin: LngLat,
  radiusKm: number,
  motion: { heading: number | null; speed: number | null } = {
    heading: null,
    speed: null,
  },
): Nearby {
  const moving =
    motion.heading != null && motion.speed != null && motion.speed >= MOVING_MPS

  const pool: Array<Candidate> = []
  for (const station of stations) {
    const price = station.prices[fuel]
    if (price == null) continue
    const d = distanceKm(origin, station)
    if (d > radiusKm) continue
    const ahead =
      moving &&
      (d < 0.2 || angleDiff(motion.heading!, bearingDeg(origin, station)) <= AHEAD_CONE_DEG)
    pool.push({ station, price, distanceKm: d, ahead })
  }

  return rank(pool, moving)
}

export function cheapestInBounds(
  stations: ReadonlyArray<Station>,
  fuel: Fuel,
  bounds: Bounds,
  origin: LngLat | null,
): Nearby {
  const pool: Array<Candidate> = []
  for (const station of stations) {
    const price = station.prices[fuel]
    if (price == null || !inBounds(station, bounds)) continue
    pool.push({
      station,
      price,
      distanceKm: origin ? distanceKm(origin, station) : null,
      ahead: false,
    })
  }
  return rank(pool, false)
}

function rank(pool: Array<Candidate>, preferAhead: boolean): Nearby {
  const prices = pool.map((c) => c.price).sort((a, b) => a - b)
  pool.sort(
    (a, b) =>
      (preferAhead ? Number(b.ahead) - Number(a.ahead) : 0) ||
      a.price - b.price ||
      (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
  )
  return {
    candidates: pool,
    localMedian: prices.length ? median(prices) : null,
    considered: pool.length,
  }
}
