import { describe, expect, it } from 'vitest'
import {
  angleDiff,
  bearingDeg,
  distanceKm,
  formatDistance,
  formatLatLng,
  indexRoute,
  locateOnRoute,
  parseLatLng,
} from './geo'

const montreal = { lng: -73.5673, lat: 45.5017 }
const quebec = { lng: -71.2082, lat: 46.8139 }

describe('geo', () => {
  it('measures straight-line distance', () => {
    expect(distanceKm(montreal, quebec)).toBeCloseTo(233, -1)
  })

  it('computes compass bearings', () => {
    expect(bearingDeg(montreal, { ...montreal, lat: 46 })).toBeCloseTo(0)
    expect(bearingDeg(montreal, quebec)).toBeGreaterThan(40)
    expect(bearingDeg(montreal, quebec)).toBeLessThan(60)
  })

  it('wraps angle differences', () => {
    expect(angleDiff(350, 10)).toBe(20)
    expect(angleDiff(90, 270)).toBe(180)
  })

  it('formats distances per locale', () => {
    expect(formatDistance(0.43, 'fr')).toBe('430 m')
    expect(formatDistance(3.24, 'fr')).toBe('3,2 km')
    expect(formatDistance(3.24, 'en')).toBe('3.2 km')
    expect(formatDistance(42.6, 'en')).toBe('43 km')
  })

  it('round-trips URL coordinates', () => {
    expect(formatLatLng(quebec)).toBe('46.81390,-71.20820')
    expect(parseLatLng('46.81390,-71.20820')).toEqual(quebec)
    expect(parseLatLng('nope')).toBeNull()
    expect(parseLatLng('95,10')).toBeNull()
  })
})

describe('route projection', () => {
  // East along the 45th parallel for one degree (~78.7 km), then north.
  const line = indexRoute([
    [-74, 45],
    ...Array.from({ length: 99 }, (_, i): [number, number] => [-74 + (i + 1) / 100, 45]),
    [-73, 45],
    [-73, 45.5],
  ])

  it('measures the route', () => {
    expect(line.lengthKm).toBeCloseTo(78.6 + 55.6, 0)
    expect(line.chunks.length).toBeGreaterThan(1)
  })

  it('finds offset and distance along the route', () => {
    const pos = locateOnRoute(line, { lng: -73.5, lat: 45.01 }, 5)
    expect(pos?.offsetKm).toBeCloseTo(1.11, 1)
    expect(pos?.alongKm).toBeCloseTo(39.3, 0)
  })

  it('clamps to the ends and to the nearest leg', () => {
    expect(locateOnRoute(line, { lng: -74.01, lat: 45 }, 5)?.alongKm).toBe(0)
    const north = locateOnRoute(line, { lng: -72.99, lat: 45.25 }, 5)
    expect(north?.offsetKm).toBeCloseTo(0.79, 1)
    expect(north?.alongKm).toBeCloseTo(78.6 + 27.8, 0)
  })

  it('ignores points beyond the corridor', () => {
    expect(locateOnRoute(line, { lng: -73.5, lat: 45.1 }, 5)).toBeNull()
    expect(locateOnRoute(line, { lng: -71, lat: 47 }, 5)).toBeNull()
  })
})
