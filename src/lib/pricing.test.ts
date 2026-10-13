import { describe, expect, it } from 'vitest'
import { indexRoute } from './geo'
import {
  cheapestAlongRoute,
  cheapestNear,
  computeFuelStats,
  median,
  stationsAlongRoute,
  stopsAhead,
  tierFor,
} from './pricing'
import type { Station } from './stations'

let n = 0
const station = (region: string, regular: number | null, lng = -73.6, lat = 45.5): Station => ({
  id: `s${++n}`,
  name: `S${n}`,
  brand: null,
  address: '',
  city: '',
  postalCode: '',
  region,
  lng,
  lat,
  prices: { regular, super: null, diesel: null },
})

describe('median', () => {
  it('handles odd and even lengths', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('tierFor', () => {
  it('buckets by share of cheaper stations', () => {
    expect([0, 0.1, 0.3, 0.7, 0.9].map(tierFor)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('computeFuelStats', () => {
  const stations = [
    station('A', 180),
    station('A', 170),
    station('A', 170),
    station('A', 190),
    station('B', 160),
    station('B', null),
  ]
  const stats = computeFuelStats(stations, 'regular')

  it('orders regions by their cheapest price', () => {
    expect(stats.regions.map((r) => r.region)).toEqual(['B', 'A'])
    expect(stats.byRegion.get('A')).toMatchObject({ count: 4, min: 170, median: 175, max: 190 })
  })

  it('shares rank and the region star between tied stations', () => {
    const a = stats.byRegion.get('A')!
    expect(a.cheapestIds).toHaveLength(2)
    const ranks = stations.slice(0, 4).map((s) => stats.ranks.get(s.id)!)
    expect(ranks.map((r) => r.rank)).toEqual([3, 1, 1, 4])
    expect(ranks.map((r) => r.regionCheapest)).toEqual([false, true, true, false])
    expect(ranks.map((r) => r.tier)).toEqual([2, 0, 0, 3])
  })

  it('skips stations without the fuel', () => {
    expect(stats.ranks.has(stations[5].id)).toBe(false)
    expect(stats.province).toMatchObject({ count: 5, min: 160, max: 190 })
  })
})

describe('cheapestNear', () => {
  const origin = { lng: -73.6, lat: 45.5 }
  const north = station('A', 185, -73.6, 45.55) // ~5.6 km north
  const south = station('A', 175, -73.6, 45.45) // ~5.6 km south
  const far = station('A', 150, -73.6, 46.5) // >100 km

  it('keeps stations within the radius, cheapest first', () => {
    const result = cheapestNear([north, south, far], 'regular', origin, 10)
    expect(result.candidates.map((c) => c.station.id)).toEqual([south.id, north.id])
    expect(result.localMedian).toBe(180)
  })

  it('puts stations ahead first when moving', () => {
    const result = cheapestNear([north, south], 'regular', origin, 10, { heading: 0, speed: 25 })
    expect(result.candidates.map((c) => [c.station.id, c.ahead])).toEqual([
      [north.id, true],
      [south.id, false],
    ])
  })
})

describe('cheapestAlongRoute', () => {
  // Due east along the 45th parallel, ~78.7 km.
  const line = indexRoute([
    [-74, 45],
    [-73, 45],
  ])
  const onRoad = station('A', 180, -73.9, 45)
  const nearby = station('A', 170, -73.5, 45.01) // ~1.1 km off
  const offRoad = station('B', 170, -73.2, 45.03) // ~3.3 km off
  const cheapFar = station('B', 150, -73.5, 45.2) // ~22 km off
  const noFuel = station('B', null, -73.4, 45)
  const stops = stationsAlongRoute([onRoad, nearby, offRoad, cheapFar, noFuel], line, 5)

  it('keeps stations within the widest corridor', () => {
    expect(stops.map((s) => s.station.id).sort()).toEqual(
      [onRoad.id, nearby.id, offRoad.id, noFuel.id].sort(),
    )
  })

  it('ranks by price, then by closeness to the route', () => {
    const result = cheapestAlongRoute(stops, 'regular', 5)
    expect(result.candidates.map((c) => c.station.id)).toEqual([nearby.id, offRoad.id, onRoad.id])
    expect(result.cheapestIds).toEqual(new Set([nearby.id, offRoad.id]))
    expect(result.median).toBe(170)
    expect(result.tiers.get(nearby.id)).toBe(0)
    expect(result.tiers.get(onRoad.id)).toBe(2)
  })

  it('narrows to the chosen corridor', () => {
    const result = cheapestAlongRoute(stops, 'regular', 2)
    expect(result.candidates.map((c) => c.station.id)).toEqual([nearby.id, onRoad.id])
    expect(result.candidates[0].alongKm).toBeCloseTo(39.3, 0)
  })
})

describe('stopsAhead', () => {
  const line = indexRoute([
    [-74, 45],
    [-73, 45],
  ])
  const early = station('A', 170, -73.9, 45) // ~7.9 km in
  const late = station('A', 180, -73.2, 45) // ~63 km in
  const along = cheapestAlongRoute(stationsAlongRoute([early, late], line, 5), 'regular', 5)

  it('drops stations already passed, with a little slack', () => {
    expect(stopsAhead(along, 0).map((c) => c.station.id)).toEqual([early.id, late.id])
    expect(stopsAhead(along, 8).map((c) => c.station.id)).toEqual([early.id, late.id])
    expect(stopsAhead(along, 9).map((c) => c.station.id)).toEqual([late.id])
  })
})
