import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { MapProvider } from 'react-map-gl/maplibre'
import { IconRefresh } from '@tabler/icons-react'
import { z } from 'zod'

import { AppHeader } from '#/components/AppHeader'
import { MapChrome } from '#/components/MapChrome'
import { StationMap } from '#/components/map/StationMap'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { FUELS } from '#/lib/stations'
import { stationsQueryOptions } from '#/lib/stations.query'
import { cn } from '#/lib/utils'
import { mapStore } from '#/stores/map'
import { m } from '#/paraglide/messages'

const searchDefaults = { fuel: 'regular', view: 'map', tab: 'stations' } as const

const searchSchema = z.object({
  fuel: z.enum(FUELS).default(searchDefaults.fuel).catch(searchDefaults.fuel),
  view: z.enum(['map', 'list']).default(searchDefaults.view).catch(searchDefaults.view),
  tab: z.enum(['stations', 'regions']).default(searchDefaults.tab).catch(searchDefaults.tab),
  region: z.string().optional().catch(undefined),
  station: z.string().optional().catch(undefined),
})

export type AppSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  // Map, geolocation and storage are browser-only.
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(stationsQueryOptions),
  pendingComponent: LoadingScreen,
  errorComponent: ErrorScreen,
  component: App,
})

function App() {
  const { view } = Route.useSearch()
  const insetBottom = useSelector(mapStore, (s) => s.insets.bottom)

  return (
    <MapProvider>
      <div className="relative flex h-dvh w-full overflow-hidden">
        <aside
          className={cn(
            'absolute inset-0 z-20 flex-col bg-background lg:static lg:z-auto lg:w-[400px] lg:shrink-0 lg:border-r',
            view === 'list' ? 'flex' : 'hidden lg:flex',
          )}
        >
          <AppHeader className="border-b p-3 pt-[max(env(safe-area-inset-top),0.75rem)]" />
        </aside>
        <main
          className="relative min-w-0 flex-1"
          style={{ '--inset-bottom': `${insetBottom}px` } as React.CSSProperties}
        >
          <StationMap />
          <MapChrome />
        </main>
      </div>
    </MapProvider>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-dvh flex-col gap-3 p-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="flex-1" />
    </div>
  )
}

function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <div className="grid h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm">{m.error_loading()}</p>
        <Button variant="outline" onClick={reset}>
          <IconRefresh />
          {m.retry()}
        </Button>
      </div>
    </div>
  )
}
