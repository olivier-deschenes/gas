import { z } from 'zod'

export const SOURCE_URL = 'https://regieessencequebec.ca/stations.geojson.gz'

export const FUELS = ['regular', 'super', 'diesel'] as const
export type Fuel = (typeof FUELS)[number]

const GAS_TYPES: Record<string, Fuel | undefined> = {
  Régulier: 'regular',
  Super: 'super',
  Diesel: 'diesel',
}

/** Rough Quebec bounding box; the feed contains a test row at [0, 0]. */
const QUEBEC_BBOX = { minLng: -80, maxLng: -56, minLat: 44, maxLat: 63 }

export interface Station {
  id: string
  name: string
  brand: string | null
  address: string
  city: string
  postalCode: string
  region: string
  lng: number
  lat: number
  /** Price in cents per litre, or null when not sold or unavailable. */
  prices: Record<Fuel, number | null>
}

export interface StationsData {
  generatedAt: string
  stations: Array<Station>
}

const upstreamSchema = z.object({
  metadata: z.object({ generated_at: z.string() }).loose(),
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
      }),
      properties: z.object({
        Name: z.string().nullish(),
        brand: z.string().nullish(),
        Address: z.string().nullish(),
        PostalCode: z.string().nullish(),
        Region: z.string().nullish(),
        Prices: z
          .array(
            z.object({
              GasType: z.string(),
              Price: z.string().nullish(),
              IsAvailable: z.boolean().nullish(),
            }),
          )
          .nullish(),
      }),
    }),
  ),
})

export type UpstreamStations = z.input<typeof upstreamSchema>

/** "199.4¢" → 199.4 */
export function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null
  const value = Number.parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanBrand(brand: string | null | undefined) {
  const trimmed = brand?.trim()
  if (!trimmed || trimmed.toLowerCase() === 'aucun') return null
  return trimmed
}

export function normalizeStations(input: unknown): StationsData {
  const data = upstreamSchema.parse(input)
  const seen = new Set<string>()
  const stations: Array<Station> = []

  for (const feature of data.features) {
    const [lng, lat] = feature.geometry.coordinates
    if (
      lng < QUEBEC_BBOX.minLng ||
      lng > QUEBEC_BBOX.maxLng ||
      lat < QUEBEC_BBOX.minLat ||
      lat > QUEBEC_BBOX.maxLat
    ) {
      continue
    }

    const p = feature.properties
    const address = p.Address?.trim() ?? ''
    const postalCode = p.PostalCode?.trim() ?? ''

    let id = slugify(`${postalCode} ${address}`) || `${lng},${lat}`
    for (let n = 2; seen.has(id); n++) id = `${id}-${n}`
    seen.add(id)

    const prices: Station['prices'] = { regular: null, super: null, diesel: null }
    for (const entry of p.Prices ?? []) {
      const fuel = GAS_TYPES[entry.GasType]
      if (fuel && entry.IsAvailable !== false) prices[fuel] = parsePrice(entry.Price)
    }

    const comma = address.lastIndexOf(',')
    stations.push({
      id,
      name: p.Name?.trim() || cleanBrand(p.brand) || address,
      brand: cleanBrand(p.brand),
      address,
      city: comma >= 0 ? address.slice(comma + 1).trim() : '',
      postalCode,
      region: p.Region?.trim() || '—',
      lng,
      lat,
      prices,
    })
  }

  return { generatedAt: data.metadata.generated_at, stations }
}
