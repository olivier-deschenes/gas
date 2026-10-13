import { RegionStar, TierBar } from '#/components/TierMark'
import { formatDistance } from '#/lib/geo'
import { formatPrice } from '#/lib/format'
import { stationTitle } from '#/lib/i18n'
import { cn } from '#/lib/utils'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { Tier } from '#/lib/pricing'
import type { Station } from '#/lib/stations'

interface StationRowProps {
  station: Station
  price: number | null
  tier: Tier | -1
  /** Cheapest of its group (region or route). */
  star?: boolean
  distanceKm?: number | null
  /** Replaces the town under the name. */
  subtitle?: React.ReactNode
  /** Replaces the distance under the price. */
  meta?: React.ReactNode
  ahead?: boolean
  size?: 'default' | 'lg'
  onSelect: (id: string) => void
  className?: string
}

export function StationRow({
  station,
  price,
  tier,
  star,
  distanceKm,
  subtitle,
  meta,
  ahead,
  size = 'default',
  onSelect,
  className,
}: StationRowProps) {
  const locale = getLocale()
  const lg = size === 'lg'

  return (
    <button
      type="button"
      onClick={() => onSelect(station.id)}
      className={cn(
        'flex w-full items-center gap-3 px-3 text-left transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted',
        lg ? 'py-3' : 'py-2.5',
        className,
      )}
    >
      <TierBar tier={tier} />
      <div className="min-w-0 flex-1">
        <div className={cn('flex items-center gap-1.5 font-medium', lg ? 'text-base' : 'text-sm')}>
          <span className="truncate">{stationTitle(station)}</span>
          {star && <RegionStar />}
        </div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {ahead && (
            <span className="font-medium text-foreground uppercase tracking-wide">
              {m.ahead()}
            </span>
          )}
          <span className="truncate">{subtitle ?? (station.city || station.address)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={cn(
            'leading-none font-semibold tabular-nums tracking-tight',
            lg ? 'text-2xl' : 'text-lg',
            price == null && 'text-sm font-normal text-muted-foreground',
          )}
        >
          {price == null ? m.unavailable() : formatPrice(price, locale)}
        </div>
        {(meta != null || distanceKm != null) && (
          <div className="mt-1 text-xs text-muted-foreground tabular-nums">
            {meta ?? formatDistance(distanceKm!, locale)}
          </div>
        )}
      </div>
    </button>
  )
}
