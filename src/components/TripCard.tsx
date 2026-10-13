import { useSelector } from '@tanstack/react-store'
import {
  IconList,
  IconPlayerStopFilled,
  IconRouteAltLeft,
  IconSteeringWheel,
} from '@tabler/icons-react'
import { MapLegend } from '#/components/MapLegend'
import {
  CorridorToggle,
  TripStatus,
  TripStopRow,
  corridorSummary,
  routeSummary,
} from '#/components/TripParts'
import { Button } from '#/components/ui/button'
import { useSetSearch } from '#/hooks/use-app-search'
import { useTrip, useTripActions, useTripProgress } from '#/hooks/use-trip'
import { stopsAhead } from '#/lib/pricing'
import { cn } from '#/lib/utils'
import { locationStore, startDriving, stopDriving } from '#/stores/location'
import { m } from '#/paraglide/messages'

const SHOWN = 3

/** The map's card while a trip is on: the cheapest stations along the route. */
export function TripCard({ collapsed = false }: { collapsed?: boolean }) {
  const trip = useTrip()
  const setSearch = useSetSearch()
  const driving = useSelector(locationStore, (s) => s.driving)
  const { travelledKm, offRoute } = useTripProgress(trip)
  const { rerouteFromHere } = useTripActions()
  const { along } = trip
  // Driving along the route: skip what's already behind.
  const pool = along && (travelledKm != null ? stopsAhead(along, travelledKm) : along.candidates)
  const top = pool?.slice(0, SHOWN) ?? []
  const summary = routeSummary(trip)
  const openList = () => setSearch({ view: 'list', tab: 'trip' }, { push: true })

  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            {m.trip_title({ place: trip.destinationName ?? m.trip_to() })}
          </h2>
          {summary && (
            <p className="truncate text-xs text-muted-foreground tabular-nums">{summary}</p>
          )}
        </div>
        <Button
          variant={driving ? 'secondary' : 'outline'}
          size="sm"
          className="h-8"
          onClick={driving ? stopDriving : startDriving}
        >
          {driving ? <IconPlayerStopFilled /> : <IconSteeringWheel />}
          {driving ? m.drive_stop() : m.drive_start()}
        </Button>
      </div>

      <div
        className={cn(
          'flex min-h-8 items-center gap-3 px-4 pt-1.5 pb-1',
          collapsed && 'max-lg:hidden',
        )}
      >
        <CorridorToggle value={trip.corridorKm} />
        {along && (
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {corridorSummary(along)}
          </p>
        )}
      </div>

      {offRoute && (
        <div className="flex items-center gap-2 px-4 py-2">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{m.off_route_notice()}</p>
          <Button variant="outline" size="sm" className="h-8" onClick={rerouteFromHere}>
            <IconRouteAltLeft />
            {m.reroute()}
          </Button>
        </div>
      )}

      <TripStatus trip={trip} onChooseStart={openList} className="px-4" />

      {along && (
        <div className="flex flex-col">
          {top.map((stop, i) => (
            <TripStopRow
              key={stop.station.id}
              stop={stop}
              along={along}
              detours={trip.detours}
              travelledKm={travelledKm}
              size={driving ? 'lg' : 'default'}
              onSelect={(id) => setSearch({ station: id })}
              className={cn('px-4', collapsed && i > 0 && 'max-lg:hidden')}
            />
          ))}
        </div>
      )}

      {pool && pool.length > SHOWN && (
        <Button
          variant="ghost"
          className={cn(
            'h-10 justify-start rounded-none border-t px-4 text-xs lg:hidden',
            collapsed && 'max-lg:hidden',
          )}
          onClick={openList}
        >
          <IconList />
          {m.trip_see_list()}
        </Button>
      )}

      <MapLegend
        scope="route"
        className={cn('border-t px-4 py-2', driving && 'hidden', collapsed && 'max-lg:hidden')}
      />
    </section>
  )
}
