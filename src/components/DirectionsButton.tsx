import { useState } from 'react'
import { IconChevronDown, IconNavigation } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  NAV_APPS,
  directionsUrl,
  navAppLabel,
  preferredNavApp,
  rememberNavApp,
  supportsStops,
} from '#/lib/directions'
import { cn } from '#/lib/utils'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import type { NavApp } from '#/lib/directions'
import type { LngLat } from '#/lib/geo'

export function DirectionsButton({
  to,
  then,
  size = 'default',
  className,
}: {
  to: LngLat
  /** On a trip: stop at `to` on the way here, where the app allows it. */
  then?: LngLat
  size?: 'default' | 'lg'
  className?: string
}) {
  const [app, setApp] = useState<NavApp>(preferredNavApp)
  const locale = getLocale()
  const height = size === 'lg' ? 'h-12 text-sm' : 'h-10 text-[13px]'

  const open = (choice: NavApp) => {
    rememberNavApp(choice)
    setApp(choice)
    window.open(directionsUrl(choice, to, then), '_blank', 'noopener')
  }
  const asStop = then != null && supportsStops(app)

  return (
    <div className={cn('flex', className)}>
      <Button className={cn('flex-1', height)} onClick={() => open(app)}>
        <IconNavigation />
        {asStop ? m.directions_stop() : m.directions()}
        <span className="font-normal opacity-60">· {navAppLabel(app, locale)}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn('border-l border-l-background/20 px-3', height)}
            aria-label={m.open_in({ app: '…' })}
          >
            <IconChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {NAV_APPS.map((choice) => (
            <DropdownMenuItem key={choice} onSelect={() => open(choice)}>
              {m.open_in({ app: navAppLabel(choice, locale) })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
