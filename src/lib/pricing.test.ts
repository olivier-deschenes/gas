import { describe, expect, it } from 'vitest'
import { cheapestNear, computeFuelStats, median, tierFor } from './pricing'
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
