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
- **Regions** — each region on one province-wide scale (range, median, lowest
  price) against the Quebec median; tap one to frame it on the map.
- **Directions** — open the station in Apple Maps, Google Maps or Waze (last
  choice remembered).
- French (default) and English, light and dark themes, installable to the home
  screen.

Fuel, view, tab, region and selected station live in the URL, so any view can be
shared or bookmarked.

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
- `src/lib/pricing.ts` — regional stats, tiers, nearby/ahead ranking
- `src/stores/location.ts` — locate, drive mode, follow, radius
- `src/components/map/` — MapLibre map, layers, price pills, user marker
- `src/components/` — header, cards, station list, regions view
- `messages/{fr,en}.json` — UI strings
