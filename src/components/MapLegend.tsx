import { RegionStar, TIER_BG } from '#/components/TierMark'
import { TIERS } from '#/lib/pricing'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 text-[11px] text-muted-foreground', className)}
      aria-label={m.legend_title()}
    >
      <span>{m.legend_cheaper()}</span>
      <span className="flex" aria-hidden>
        {TIERS.map((t) => (
          <span key={t} className={cn('h-1.5 w-4', TIER_BG[t])} />
        ))}
      </span>
      <span>{m.legend_pricier()}</span>
      <span className="ml-auto flex items-center gap-1">
        <RegionStar />
        {m.region_cheapest()}
      </span>
    </div>
  )
}
