import { describe, expect, it } from 'vitest'
import { directionsUrl } from './directions'

const station = { lng: -72.5, lat: 46.2 }
const destination = { lng: -71.2082, lat: 46.8139 }

describe('directionsUrl', () => {
  it('goes straight to the station without a trip', () => {
    expect(directionsUrl('google', station)).toContain('destination=46.2,-72.5')
    expect(directionsUrl('waze', station)).toContain('ll=46.2,-72.5')
  })

  it('stops at the station on the way to the destination', () => {
    expect(directionsUrl('google', station, destination)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=46.8139,-71.2082&waypoints=46.2,-72.5&travelmode=driving',
    )
    expect(directionsUrl('apple', station, destination)).toBe(
      'https://maps.apple.com/directions?destination=46.8139,-71.2082&waypoint=46.2,-72.5&mode=driving',
    )
  })

  it("falls back to the station where stops aren't supported", () => {
    expect(directionsUrl('waze', station, destination)).toBe(directionsUrl('waze', station))
  })
})
