import { IconList, IconMap } from '@tabler/icons-react'
import { cn } from '#/lib/utils'
import { AppMenu } from '#/components/AppMenu'
import { FuelToggle } from '#/components/FuelToggle'
import { Button } from '#/components/ui/button'
import { useAppSearch, useSetSearch } from '#/hooks/use-app-search'
import { useNow } from '#/hooks/use-now'
import { useStations } from '#/hooks/use-stations'
import { formatRelative } from '#/lib/format'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

export function AppHeader({ className }: { className?: string }) {
  const { generatedAt } = useStations()
  const { view } = useAppSearch()
  const setSearch = useSetSearch()
  const now = useNow()
  const nextView = view === 'map' ? 'list' : 'map'

  return (
    <header className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Logo />
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">{m.app_name()}</h1>
          <p className="truncate text-xs text-muted-foreground" title={generatedAt}>
            {m.updated({ time: formatRelative(new Date(generatedAt), getLocale(), now) })}
          </p>
        </div>
        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 lg:hidden"
            onClick={() => setSearch({ view: nextView }, { push: true })}
          >
            {nextView === 'list' ? <IconList /> : <IconMap />}
            {nextView === 'list' ? m.view_list() : m.view_map()}
          </Button>
          <AppMenu />
        </div>
      </div>
      <FuelToggle />
    </header>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true">
      <rect width="24" height="24" className="fill-foreground" />
      <path
        d="M8 6h6.5a3.5 3.5 0 0 1 0 7H11v5H8z M11 9v1h3.5a.5.5 0 0 0 0-1z"
        className="fill-background"
        fillRule="evenodd"
      />
      <rect x="15" y="16" width="3" height="2" className="fill-tier-0" />
    </svg>
  )
}
