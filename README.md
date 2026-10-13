# Plein

Live Quebec gas prices on a map, built for checking from the car.

Data comes from the Régie de l'énergie du Québec's public feed
(`https://regieessencequebec.ca/stations.geojson.gz`, ~2,460 stations,
refreshed every few minutes).

## What it does

- **Map** — every station, coloured by how its price ranks _within its
  administrative region_ (green = cheapest 10 %, red = priciest 10 %). From
  zoom 10 prices appear as pills; when they overlap, the cheapest wins. A ★
  marks each region's lowest price at every zoom.
- **Fuel** — Regular by default; switch to Premium or Diesel.
- **Near me** — locate once to see the cheapest stations within 5 / 10 / 25 km
  and the local median.
- **Drive mode** — tracks your position, follows heading-up, keeps the screen
  on, and ranks stations _ahead_ of you first. Pan to look around; Recenter to
  resume.
- **List** — every station sorted by price or distance, with search and a
  region filter.
- **Trip** — pick a destination (and optionally a start other than your
  location) to see the cheapest stations within 1 / 2 / 5 km of the driving
  route, coloured against each other, with how far along the trip and how far
  off the road each one is. Sort by price or by route order. In drive mode the
  card counts down the distance to stations still ahead and offers to reroute
  if you leave the route.
- **Regions** — each region on one province-wide scale (range, median, lowest
  price) against the Quebec median; tap one to frame it on the map.
- **Directions** — open the station in Apple Maps, Google Maps or Waze (last
  choice remembered). On a trip, Apple Maps and Google Maps get the station as
  a stop on the way to the destination; Waze links take one destination, so
  they go to the station.
- French (default) and English, light and dark themes, installable to the home
  screen.

Fuel, view, tab, region, selected station and trip endpoints live in the URL, so
any view can be shared or bookmarked. A trip from "your location" keeps that
position out of the URL.

Trips use two free, keyless public services straight from the browser: Komoot's
Photon for place search and the OSRM demo server for driving routes. Both are
fair-use with no uptime guarantee; `src/lib/places.ts` and `src/lib/routing.ts`
are the only files to change to swap providers.

## Stack

TanStack Start (React 19, file routes, Cloudflare Workers), TanStack Query
(feed), Router (URL state), Store (location, map, theme), Table v9 + Virtual
(list), MapLibre GL via react-map-gl with OpenFreeMap basemaps (no API key),
shadcn/ui + Tailwind 4, Paraglide (i18n), Vitest.

The browser fetches the feed directly: it is CDN-cached and CORS-enabled, so
there is no server proxy.

## Develop

```bash
bun install
bun run dev        # http://localhost:3000
bun run test       # unit tests (normalization, pricing, geo)
bun run lint
bun run build
```

Geolocation needs a secure context. `localhost` works on the desktop; to try
location and drive mode on a phone, deploy (`bun run deploy`) or use an HTTPS
tunnel.

## Layout

- `src/lib/stations.ts` — feed fetch, validation and normalization
- `src/lib/pricing.ts` — regional stats, tiers, nearby/ahead and along-route
  ranking
- `src/lib/geo.ts` — distances, bearings, route indexing and projection
- `src/lib/places.ts`, `src/lib/routing.ts` — place search and driving routes
- `src/hooks/use-trip.ts` — the trip in the URL, its route and corridor
- `src/stores/location.ts` — locate, drive mode, follow, radius
- `src/stores/trip.ts` — corridor width, trip start
- `src/components/map/` — MapLibre map, layers, price pills, user marker
- `src/components/` — header, cards, station list, regions view
- `messages/{fr,en}.json` — UI strings
