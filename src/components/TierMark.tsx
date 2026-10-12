import { IconStarFilled } from '@tabler/icons-react'
import { cn } from '#/lib/utils'
import type { Tier } from '#/lib/pricing'

export const TIER_BG: Record<Tier | -1, string> = {
  [-1]: 'bg-tier-none',
  0: 'bg-tier-0',
  1: 'bg-tier-1',
  2: 'bg-tier-2',
  3: 'bg-tier-3',
  4: 'bg-tier-4',
}

/** Vertical bar in the station's regional price-tier colour. */
export function TierBar({ tier, className }: { tier: Tier | -1; className?: string }) {
  return <span aria-hidden className={cn('w-1 shrink-0 self-stretch', TIER_BG[tier], className)} />
}

export function RegionStar({ className }: { className?: string }) {
  return <IconStarFilled aria-hidden className={cn('size-3 shrink-0 text-tier-0', className)} />
}
