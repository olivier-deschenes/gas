import { useSelector } from '@tanstack/react-store'
import { IconRefresh } from '@tabler/icons-react'
import { StationRow } from '#/components/StationRow'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatDistance } from '#/lib/geo'
import { formatDuration, formatPrice } from '#/lib/format'
import { stationsCount } from '#/lib/i18n'
import { RouteError } from '#/lib/routing'
import { cn } from '#/lib/utils'
import { locationStore } from '#/stores/location'
import { CORRIDORS_KM, setCorridor } from '#/stores/trip'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { Trip } from '#/hooks/use-trip'
import type { AlongRoute, RouteCandidate } from '#/lib/pricing'
import type { CorridorKm } from '#/stores/trip'

/** Closer than this reads as "on the route" rather than a distance off it. */
const ON_ROUTE_KM = 0.25

export function TripStopRow({
  stop,
  along,
  size,
  onSelect,
  className,
}: {
  stop: RouteCandidate
  along: AlongRoute
  size?: 'default' | 'lg'
  onSelect: (id: string) => void
  className?: string
}) {
  const locale = getLocale()
  const { station } = stop
  const offset =
    stop.offsetKm < ON_ROUTE_KM
      ? m.on_route()
      : m.off_route({ distance: formatDistance(stop.offsetKm, locale) })

  return (
    <StationRow
      station={station}
      price={stop.price}
      tier={along.tiers.get(station.id) ?? -1}
      star={along.cheapestIds.has(station.id)}
      subtitle={station.city ? `${station.city} · ${offset}` : offset}
      meta={m.along_km({
        km: new Intl.NumberFormat(locale).format(Math.round(stop.alongKm)),
      })}
      size={size}
      onSelect={onSelect}
      className={className}
    />
  )
}

export function CorridorToggle({ value }: { value: CorridorKm }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      spacing={0}
      value={String(value)}
      onValueChange={(next) => next && setCorridor(Number(next) as CorridorKm)}
      aria-label={m.corridor_label()}
    >
      {CORRIDORS_KM.map((km) => (
        <ToggleGroupItem key={km} value={String(km)} className="h-7 px-2 tabular-nums">
          {km} km
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** "251 km · 3 h 25" */
export function routeSummary(trip: Trip) {
  const route = trip.route.data
  if (!route) return null
  const locale = getLocale()
  return `${formatDistance(route.distanceKm, locale)} · ${formatDuration(route.durationMin, locale)}`
}

/** "18 stations · med. 185.9" */
export function corridorSummary(along: AlongRoute) {
  const locale = getLocale()
  const count = stationsCount(along.candidates.length)
  return along.median == null
    ? count
    : `${count} · ${m.median_short()} ${formatPrice(along.median, locale)}`
}

/**
 * Whatever stands between the trip and its results: no start, a route still
 * loading, a failed route or an empty corridor. Null once there is a list.
 */
export function TripStatus({
  trip,
  rows = 1,
  onChooseStart,
  className,
}: {
  trip: Trip
  rows?: number
  onChooseStart?: () => void
  className?: string
}) {
  const geoStatus = useSelector(locationStore, (s) => s.status)
  const { route, along } = trip

  if (!trip.origin) {
    if (geoStatus === 'locating')
      return <LoadingRows rows={rows} label={m.trip_loading()} className={className} />
    return (
      <div className={cn('flex flex-col items-start gap-2 py-3', className)}>
        <p className="text-xs text-muted-foreground">{m.trip_need_start()}</p>
        {onChooseStart && (
          <Button variant="outline" size="sm" className="h-8" onClick={onChooseStart}>
            {m.trip_from_placeholder()}
          </Button>
        )}
      </div>
    )
  }

  if (route.isPending)
    return <LoadingRows rows={rows} label={m.trip_loading()} className={className} />

  if (route.isError) {
    const noRoute = route.error instanceof RouteError && route.error.reason === 'no_route'
    return (
      <div className={cn('flex flex-col items-start gap-2 py-3', className)}>
        <p className="text-xs text-muted-foreground">
          {noRoute ? m.trip_no_route() : m.trip_failed()}
        </p>
        {!noRoute && (
          <Button variant="outline" size="sm" className="h-8" onClick={() => route.refetch()}>
            <IconRefresh />
            {m.retry()}
          </Button>
        )}
      </div>
    )
  }

  if (along && along.candidates.length === 0) {
    return (
      <p className={cn('py-3 text-xs text-muted-foreground', className)}>
        {m.trip_none({ corridor: `${trip.corridorKm} km` })}
      </p>
    )
  }

  return null
}

function LoadingRows({
  rows,
  label,
  className,
}: {
  rows: number
  label: string
  className?: string
}) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn('flex items-center gap-3 py-2.5', className)}>
          <Skeleton className="h-9 w-1" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  )
}
