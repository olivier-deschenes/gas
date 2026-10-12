import { useSelector } from '@tanstack/react-store'
import { MapLegend } from '#/components/MapLegend'
import { StationRow } from '#/components/StationRow'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useFuelStats, useStations } from '#/hooks/use-stations'
import { cheapestInBounds } from '#/lib/pricing'
import { mapStore } from '#/stores/map'
import { m } from '#/paraglide/messages'

const SHOWN = 3

export function NearbyCard() {
  const { stations } = useStations()
  const { fuel, region } = useAppSearch()
  const setSearch = useSetSearch()
  const stats = useFuelStats(fuel)
  const bounds = useSelector(mapStore, (s) => s.bounds)

  const pool = region ? stations.filter((s) => s.region === region) : stations
  const result = bounds ? cheapestInBounds(pool, fuel, bounds, null) : null
  const top = result?.candidates.slice(0, SHOWN) ?? []

  return (
    <section className="flex flex-col">
      <div className="flex items-baseline gap-2 px-4 pt-3 pb-1">
        <h2 className="text-sm font-semibold tracking-tight">{m.in_view_title()}</h2>
        {result && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {m.stations_count({ count: result.considered })}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        {top.map((c) => (
          <StationRow
            key={c.station.id}
            station={c.station}
            price={c.price}
            rank={stats.ranks.get(c.station.id)}
            distanceKm={c.distanceKm}
            onSelect={(id) => setSearch({ station: id })}
            className="px-4"
          />
        ))}
        {result && top.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted-foreground">{m.no_results()}</p>
        )}
      </div>
      <MapLegend className="border-t px-4 py-2" />
    </section>
  )
}
