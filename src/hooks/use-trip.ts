import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useStations } from '#/hooks/use-stations'
import { formatLatLng, locateOnRoute, parseLatLng } from '#/lib/geo'
import { cheapestAlongRoute, stationsAlongRoute } from '#/lib/pricing'
import { routeQueryOptions } from '#/lib/trip.query'
import { locateOnce, locationStore } from '#/stores/location'
import { MAX_CORRIDOR_KM, setTripStart, tripStore } from '#/stores/trip'
import type { RouteLine } from '#/lib/geo'
import type { AlongRoute, RouteStop } from '#/lib/pricing'
import type { Place } from '#/lib/places'
import type { Fuel, Station } from '#/lib/stations'

// Shared by the map, card and list; compute once per route and dataset.
const stopsCache = new WeakMap<ReadonlyArray<Station>, WeakMap<RouteLine, Array<RouteStop>>>()
const alongCache = new WeakMap<Array<RouteStop>, Map<string, AlongRoute>>()

function getStops(stations: ReadonlyArray<Station>, line: RouteLine) {
  let perLine = stopsCache.get(stations)
  if (!perLine) stopsCache.set(stations, (perLine = new WeakMap()))
  let stops = perLine.get(line)
  if (!stops) perLine.set(line, (stops = stationsAlongRoute(stations, line, MAX_CORRIDOR_KM)))
  return stops
}

function getAlong(stops: Array<RouteStop>, fuel: Fuel, corridorKm: number) {
  let perKey = alongCache.get(stops)
  if (!perKey) alongCache.set(stops, (perKey = new Map()))
  const key = `${fuel}:${corridorKm}`
  let along = perKey.get(key)
  if (!along) perKey.set(key, (along = cheapestAlongRoute(stops, fuel, corridorKm)))
  return along
}

/**
 * The trip in the URL, its route, and the stations along it. A trip is on as
 * soon as it has a destination; without `from` it starts where the user was
 * when the trip was set.
 */
export function useTrip() {
  const { stations } = useStations()
  const { fuel, to, toName, from, fromName } = useAppSearch()
  const corridorKm = useSelector(tripStore, (s) => s.corridorKm)
  const start = useSelector(tripStore, (s) => s.start)

  const destination = parseLatLng(to)
  const origin = from ? parseLatLng(from) : start
  const route = useQuery(routeQueryOptions(origin, destination))
  const line = route.data?.line ?? null
  const along = line ? getAlong(getStops(stations, line), fuel, corridorKm) : null

  return {
    active: destination != null,
    destination,
    destinationName: toName,
    origin,
    originName: from ? fromName : undefined,
    fromMyLocation: !from,
    route,
    along,
    corridorKm,
  }
}

export type Trip = ReturnType<typeof useTrip>

/** Further than this from the route, drive mode stops trusting "ahead". */
const OFF_ROUTE_KM = 1

/**
 * Drive mode on a trip: how far along the route the user is, or that they've
 * left it. Both null when not driving or no route yet.
 */
export function useTripProgress(trip: Trip) {
  const driving = useSelector(locationStore, (s) => s.driving)
  const fix = useSelector(locationStore, (s) => s.fix)
  const line = trip.route.data?.line
  if (!driving || !fix || !line) return { travelledKm: null, offRoute: false }
  const pos = locateOnRoute(line, fix, OFF_ROUTE_KM)
  return { travelledKm: pos?.alongKm ?? null, offRoute: pos == null }
}

/**
 * A trip from "my location" opened from a link or a reload has no start yet;
 * take the first fix. Mount once, high in the tree.
 */
export function useTripStart() {
  const { to, from } = useAppSearch()
  const fix = useSelector(locationStore, (s) => s.fix)
  const start = useSelector(tripStore, (s) => s.start)
  const needsStart = to != null && from == null && start == null
  useEffect(() => {
    if (needsStart && fix) setTripStart(fix)
  }, [needsStart, fix])
}

/** Start from wherever the user is now, locating them if needed. */
async function startHere() {
  const fix = locationStore.state.fix ?? (await locateOnce())
  setTripStart(fix)
}

export function useTripActions() {
  const search = useAppSearch()
  const setSearch = useSetSearch()

  return {
    /** Picking a destination shows the route on the map. */
    setDestination(place: Place) {
      if (!search.from) void startHere()
      setSearch(
        {
          to: formatLatLng(place),
          toName: place.name,
          station: undefined,
          region: undefined,
          view: 'map',
        },
        { push: true },
      )
    },
    /** `null` starts from the user's location. */
    setOrigin(place: Place | null) {
      if (!place) void startHere()
      setSearch({
        from: place ? formatLatLng(place) : undefined,
        fromName: place?.name,
      })
    },
    /** Drop the planned start and route from where the user is now. */
    rerouteFromHere() {
      setTripStart(locationStore.state.fix)
      setSearch({ from: undefined, fromName: undefined })
    },
    clear() {
      setTripStart(null)
      setSearch({
        to: undefined,
        toName: undefined,
        from: undefined,
        fromName: undefined,
      })
    },
  }
}
