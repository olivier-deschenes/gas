import { describe, expect, it } from 'vitest'
import { normalizeStations, parsePrice } from './stations'

const feature = (props: Record<string, unknown>, coordinates = [-73.6, 45.5]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: {
    Name: 'Station',
    brand: 'Shell',
    Status: 'En opération',
    Address: '1 rue Principale, Laval',
    PostalCode: 'H7A 1A1',
    Region: 'Laval',
    Prices: [],
    ...props,
  },
})

const feed = (features: Array<unknown>) => ({
  type: 'FeatureCollection',
  metadata: { generated_at: '2026-10-12T23:25:00Z' },
  features,
})

describe('parsePrice', () => {
  it('reads cents per litre', () => {
    expect(parsePrice('199.4¢')).toBe(199.4)
    expect(parsePrice('199,4 ¢')).toBe(199.4)
  })
  it('treats missing values as null', () => {
    expect(parsePrice(null)).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('¢')).toBeNull()
  })
})

describe('normalizeStations', () => {
  it('maps prices by fuel and drops unavailable ones', () => {
    const { stations, generatedAt } = normalizeStations(
      feed([
        feature({
          Prices: [
            { GasType: 'Régulier', Price: '189.9¢', IsAvailable: true },
            { GasType: 'Super', Price: '209.9¢', IsAvailable: true },
            { GasType: 'Diesel', Price: null, IsAvailable: false },
          ],
        }),
      ]),
    )
    expect(generatedAt).toBe('2026-10-12T23:25:00Z')
    expect(stations[0].prices).toEqual({ regular: 189.9, super: 209.9, diesel: null })
    expect(stations[0].city).toBe('Laval')
  })

  it('tidies all-caps city names', () => {
    const { stations } = normalizeStations(
      feed([feature({ Address: '2 rue B, SAINT-JEAN-SUR-RICHELIEU' })]),
    )
    expect(stations[0].city).toBe('Saint-Jean-sur-Richelieu')
  })

  it('drops rows outside Quebec', () => {
    const { stations } = normalizeStations(feed([feature({}, [0, 0]), feature({ Address: '2 rue B, Laval' })]))
    expect(stations).toHaveLength(1)
  })

  it('cleans placeholder brands', () => {
    const { stations } = normalizeStations(
      feed([feature({ brand: 'Aucun' }), feature({ brand: null, Address: '3 rue C' })]),
    )
    expect(stations.map((s) => s.brand)).toEqual([null, null])
  })

  it('builds unique, URL-safe ids', () => {
    const { stations } = normalizeStations(
      feed([feature({ Address: '5 boul. Pie-X, Québec' }), feature({ Address: '5 boul. Pie-X, Québec' })]),
    )
    expect(stations[0].id).toBe('h7a-1a1-5-boul-pie-x-quebec')
    expect(stations[1].id).toBe('h7a-1a1-5-boul-pie-x-quebec-2')
  })
})
