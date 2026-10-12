import { describe, expect, it } from 'vitest'
import { angleDiff, bearingDeg, distanceKm, formatDistance } from './geo'

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
})
