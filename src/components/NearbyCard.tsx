import { useSelector } from '@tanstack/react-store'
import { IconPlayerStopFilled, IconSteeringWheel } from '@tabler/icons-react'
import { MapLegend } from '#/components/MapLegend'
import { StationRow } from '#/components/StationRow'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useFuelStats, useStations } from '#/hooks/use-stations'
import { formatPrice } from '#/lib/format'
import { cheapestInBounds, cheapestNear } from '#/lib/pricing'
import { stationsCount } from '#/lib/i18n'
import { cn } from '#/lib/utils'
import { mapStore } from '#/stores/map'
import { RADII_KM, locationStore, setRadius, startDriving, stopDriving } from '#/stores/location'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { RadiusKm } from '#/stores/location'

const SHOWN = 3

/**
 * `collapsed` (phones only) keeps the title and the single best pick so the
 * map stays in view; the desktop corner card always shows everything.
 */
export function NearbyCard({ collapsed = false }: { collapsed?: boolean }) {
  const { stations } = useStations()
  const { fuel, region } = useAppSearch()
  const setSearch = useSetSearch()
  const stats = useFuelStats(fuel)
  const bounds = useSelector(mapStore, (s) => s.bounds)
  const fix = useSelector(locationStore, (s) => s.fix)
  const driving = useSelector(locationStore, (s) => s.driving)
  const radiusKm = useSelector(locationStore, (s) => s.radiusKm)
  const locale = getLocale()

  const pool = region ? stations.filter((s) => s.region === region) : stations
  const result = fix
    ? // Only rank by direction of travel in drive mode; a one-off fix may be stale.
      cheapestNear(pool, fuel, fix, radiusKm, driving ? fix : undefined)
    : bounds
      ? cheapestInBounds(pool, fuel, bounds, null)
      : null
  const top = result?.candidates.slice(0, SHOWN) ?? []

  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {driving ? m.drive_active() : fix ? m.nearby_title() : m.in_view_title()}
        </h2>
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
        {fix && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={String(radiusKm)}
            onValueChange={(value) => value && setRadius(Number(value) as RadiusKm)}
            aria-label={m.radius_label()}
          >
            {RADII_KM.map((km) => (
              <ToggleGroupItem key={km} value={String(km)} className="h-7 px-2 tabular-nums">
                {km} km
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {result && (
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {stationsCount(result.considered)}
            {fix && result.localMedian != null && (
              <> · {m.median_short()} {formatPrice(result.localMedian, locale)}</>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col">
        {top.map((c, i) => (
          <StationRow
            key={c.station.id}
            station={c.station}
            price={c.price}
            tier={stats.ranks.get(c.station.id)?.tier ?? -1}
            star={stats.ranks.get(c.station.id)?.regionCheapest}
            distanceKm={c.distanceKm}
            ahead={c.ahead}
            size={driving ? 'lg' : 'default'}
            onSelect={(id) => setSearch({ station: id })}
            className={cn('px-4', collapsed && i > 0 && 'max-lg:hidden')}
          />
        ))}
        {result && top.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            {fix ? m.no_nearby({ radius: `${radiusKm} km` }) : m.no_results()}
          </p>
        )}
      </div>

      <MapLegend
        className={cn('border-t px-4 py-2', driving && 'hidden', collapsed && 'max-lg:hidden')}
      />
      {driving && (
        <p
          className={cn(
            'border-t px-4 py-2 text-[11px] text-muted-foreground',
            collapsed && 'max-lg:hidden',
          )}
        >
          {m.screen_on()}
        </p>
      )}
    </section>
  )
}
