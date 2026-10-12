import { RegionStar } from '#/components/TierMark'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useFuelStats, useStations } from '#/hooks/use-stations'
import { formatPrice } from '#/lib/format'
import { stationTitle, stationsCount } from '#/lib/i18n'
import { cn } from '#/lib/utils'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { RegionStat } from '#/lib/pricing'

/**
 * Every region on one province-wide price scale, so the spread and the
 * cheapest region are visible at a glance (cheapest first).
 */
export function RegionList() {
  const { byId } = useStations()
  const { fuel, region: selected } = useAppSearch()
  const setSearch = useSetSearch()
  const stats = useFuelStats(fuel)
  const locale = getLocale()
  const province = stats.province

  if (!province) return <p className="p-4 text-sm text-muted-foreground">{m.no_results()}</p>

  const lo = province.min
  const hi = province.max
  const x = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 pt-3 pb-2 backdrop-blur">
        <p className="text-xs text-muted-foreground">{m.regions_caption()}</p>
        <Axis lo={lo} hi={hi} median={province.median} x={x} locale={locale} />
      </div>
      <ul>
        {stats.regions.map((r) => (
          <li key={r.region} className="border-b">
            <RegionRow
              stat={r}
              x={x}
              provinceMedian={province.median}
              cheapest={byId.get(r.cheapestIds[0])}
              selected={r.region === selected}
              locale={locale}
              onSelect={() =>
                setSearch({ region: r.region, station: undefined, view: 'map' }, { push: true })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Axis({
  lo,
  hi,
  median,
  x,
  locale,
}: {
  lo: number
  hi: number
  median: number
  x: (v: number) => string
  locale: string
}) {
  return (
    <div className="relative mt-3 h-4 text-[10px] text-muted-foreground tabular-nums">
      <span className="absolute left-0">{formatPrice(lo, locale)}</span>
      <span className="absolute -translate-x-1/2" style={{ left: x(median) }}>
        {formatPrice(median, locale)}
      </span>
      <span className="absolute right-0">{formatPrice(hi, locale)}</span>
    </div>
  )
}

function RegionRow({
  stat,
  x,
  provinceMedian,
  cheapest,
  selected,
  locale,
  onSelect,
}: {
  stat: RegionStat
  x: (v: number) => string
  provinceMedian: number
  cheapest: ReturnType<ReturnType<typeof useStations>['byId']['get']>
  selected: boolean
  locale: string
  onSelect: () => void
}) {
  const ties = stat.cheapestIds.length - 1

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted',
        selected && 'bg-muted',
      )}
    >
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{stat.region}</span>
        <span className="text-lg leading-none font-semibold tracking-tight tabular-nums">
          {formatPrice(stat.min, locale)}
        </span>
      </div>

      <div className="relative h-3" aria-hidden>
        {/* Quebec median reference, aligned across rows */}
        <span
          className="absolute inset-y-[-6px] border-l border-dashed border-muted-foreground/50"
          style={{ left: x(provinceMedian) }}
        />
        <span
          className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-muted-foreground/25"
          style={{ left: x(stat.min), right: `calc(100% - ${x(stat.max)})` }}
        />
        <span
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: x(stat.median) }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tier-0 ring-2 ring-background"
          style={{ left: x(stat.min) }}
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RegionStar />
        <span className="min-w-0 flex-1 truncate">
          {cheapest ? `${stationTitle(cheapest)}${cheapest.city ? `, ${cheapest.city}` : ''}` : '—'}
          {ties > 0 && ` +${ties}`}
        </span>
        <span className="shrink-0 tabular-nums">
          {m.median_short()} {formatPrice(stat.median, locale)} ·{' '}
          {stationsCount(stat.count)}
        </span>
      </div>
    </button>
  )
}
