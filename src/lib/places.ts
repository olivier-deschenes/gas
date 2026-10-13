import { z } from 'zod'
import type { LngLat } from './geo'

/** Komoot's public Photon geocoder: OSM data, no key, CORS-enabled, fair use. */
const PHOTON_URL = 'https://photon.komoot.io/api/'

/** Quebec plus its neighbours, so Ottawa or Edmundston still resolve. */
const SEARCH_BBOX = '-80,44,-56,63'

export interface Place extends LngLat {
  id: string
  name: string
  /** Street, town and province, whichever add something to the name. */
  detail: string
}

const photonSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z
        .object({
          osm_type: z.string().nullish(),
          osm_id: z.number().nullish(),
          name: z.string().nullish(),
          housenumber: z.string().nullish(),
          street: z.string().nullish(),
          city: z.string().nullish(),
          county: z.string().nullish(),
          state: z.string().nullish(),
          country: z.string().nullish(),
        })
        .loose(),
    }),
  ),
})

type PhotonProps = z.infer<typeof photonSchema>['features'][number]['properties']

const HOME = new Set(['Québec', 'Quebec', 'Canada'])

export function toPlace(props: PhotonProps, [lng, lat]: [number, number]): Place | null {
  const street = [props.housenumber, props.street].filter(Boolean).join(' ')
  const name = props.name ?? street
  if (!name) return null
  const parts = [
    props.name ? street : null,
    props.city ?? props.county,
    // Only name the province or country when it isn't the obvious one.
    props.state && !HOME.has(props.state) ? props.state : null,
    props.country && !HOME.has(props.country) ? props.country : null,
  ]
  const detail = parts.filter((p): p is string => !!p && p !== name)
  return {
    id: `${props.osm_type ?? ''}${props.osm_id ?? `${lng},${lat}`}`,
    name,
    detail: [...new Set(detail)].join(', '),
    lng,
    lat,
  }
}

export async function searchPlaces(
  query: string,
  { locale, near }: { locale: string; near: LngLat | null },
  signal?: AbortSignal,
): Promise<Array<Place>> {
  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('lang', locale.startsWith('fr') ? 'fr' : 'en')
  url.searchParams.set('limit', '8')
  url.searchParams.set('bbox', SEARCH_BBOX)
  if (near) {
    // A coarse position is enough to prefer nearby matches.
    url.searchParams.set('lat', near.lat.toFixed(1))
    url.searchParams.set('lon', near.lng.toFixed(1))
    url.searchParams.set('zoom', '9')
  }

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Place search failed: ${res.status}`)
  const { features } = photonSchema.parse(await res.json())

  const seen = new Set<string>()
  const places: Array<Place> = []
  for (const f of features) {
    const place = toPlace(f.properties, f.geometry.coordinates)
    const key = place && `${place.name}|${place.detail}`
    if (!place || !key || seen.has(key)) continue
    seen.add(key)
    places.push(place)
  }
  return places.slice(0, 6)
}
