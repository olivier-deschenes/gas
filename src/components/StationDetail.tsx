import { IconX } from '@tabler/icons-react'
import { DirectionsButton } from '#/components/DirectionsButton'
import { RegionStar, TierBar } from '#/components/TierMark'
import { Button } from '#/components/ui/button'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useFuelStats, useStations } from '#/hooks/use-stations'
import { formatCents, formatPrice } from '#/lib/format'
import { fuelLabel, stationSubtitle, stationTitle } from '#/lib/i18n'
import { FUELS } from '#/lib/stations'
import { cn } from '#/lib/utils'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

export function StationDetail({ id, children }: { id: string; children?: React.ReactNode }) {
  const { byId } = useStations()
  const { fuel } = useAppSearch()
  const setSearch = useSetSearch()
  const stats = useFuelStats(fuel)
  const locale = getLocale()

  const station = byId.get(id)
  if (!station) return null

  const price = station.prices[fuel]
  const rank = stats.ranks.get(id)
  const region = stats.byRegion.get(station.region)
  const subtitle = stationSubtitle(station)
  const delta = price != null && region ? price - region.median : null

  return (
    <section aria-label={stationTitle(station)} className="flex flex-col">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight">
            {stationTitle(station)}
          </h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          <p className="text-xs text-muted-foreground">{station.address}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-2"
          aria-label={m.close()}
          onClick={() => setSearch({ station: undefined })}
        >
          <IconX />
        </Button>
      </div>

      <div className="grid grid-cols-3 border-y" role="group" aria-label={m.prices_heading()}>
        {FUELS.map((f) => {
          const p = station.prices[f]
          return (
            <button
              key={f}
              type="button"
              aria-pressed={f === fuel}
              onClick={() => setSearch({ fuel: f })}
              className={cn(
                'border-r px-4 py-2.5 text-left transition-colors last:border-r-0 hover:bg-muted/60',
                f === fuel ? 'bg-muted' : 'text-muted-foreground',
              )}
            >
              <div className="text-[11px] tracking-wide uppercase">{fuelLabel(f)}</div>
              <div
                className={cn(
                  'text-xl font-semibold tabular-nums tracking-tight',
                  f === fuel && 'text-foreground',
                  p == null && 'text-base font-normal',
                )}
              >
                {p == null ? '—' : formatPrice(p, locale)}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {rank && region && (
          <div className="flex items-stretch gap-2.5 text-xs">
            <TierBar tier={rank.tier} />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                {rank.regionCheapest && <RegionStar />}
                {rank.rank === 1
                  ? m.rank_first({ region: station.region, total: rank.total })
                  : m.rank_nth({ region: station.region, rank: rank.rank, total: rank.total })}
              </span>
              {delta != null && (
                <span className="text-muted-foreground">
                  {Math.abs(delta) < 0.05
                    ? m.at_median()
                    : delta < 0
                      ? m.below_median({ value: formatCents(delta, locale) })
                      : m.above_median({ value: formatCents(delta, locale) })}
                </span>
              )}
            </div>
          </div>
        )}
        {children}
        <DirectionsButton to={station} />
      </div>
    </section>
  )
}
