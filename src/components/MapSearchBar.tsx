import { IconSearch } from '@tabler/icons-react'
import { Logo } from '#/components/AppHeader'
import { AppMenu } from '#/components/AppMenu'
import { useSetSearch } from '#/hooks/use-app-search'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/** Mobile map header: one compact bar that opens the station search. */
export function MapSearchBar({ className }: { className?: string }) {
  const setSearch = useSetSearch()

  return (
    <div
      className={cn(
        'flex h-12 items-center gap-1 border bg-background pr-1 pl-3 shadow-lg shadow-black/10',
        className,
      )}
    >
      <Logo />
      <button
        type="button"
        onClick={() => setSearch({ view: 'list', tab: 'stations' }, { push: true })}
        className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm text-muted-foreground outline-none"
      >
        <IconSearch className="size-4 shrink-0" />
        <span className="truncate">{m.search_placeholder()}</span>
      </button>
      <AppMenu />
    </div>
  )
}
